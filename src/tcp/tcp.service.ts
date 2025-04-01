import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket, createServer } from 'net';
import { EventEmitter } from 'events';
import { DataService } from './data.service';
import { QueueService } from '../redis/queue.service';
import { connections, ConnectionConfig } from '../config/connections.config';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class TcpService implements OnModuleInit, OnModuleDestroy {
  private servers: Map<string, Server> = new Map();
  private clientsByProject: Map<string, Socket[]> = new Map();
  public connectionEvent = new EventEmitter();
  private healthCheckInterval: NodeJS.Timeout;
  private dataProcessingStatus: Map<
    string,
    { lastProcessTime: number; isStuck: boolean }
  > = new Map();
  private readonly STUCK_THRESHOLD = 60000; // 1 minuto sin procesar datos completos

  constructor(
    private readonly dataService: DataService,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    connections.forEach((connection) => {
      this.startServer(connection);
      // Inicializar el estado de procesamiento para cada proyecto
      this.dataProcessingStatus.set(connection.projectName, {
        lastProcessTime: Date.now(),
        isStuck: false,
      });
    });

    // Iniciar verificación periódica de salud del servicio
    this.healthCheckInterval = setInterval(
      () => this.checkServiceHealth(),
      60000,
    );
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.stopServer();
  }

  startServer(config: ConnectionConfig): void {
    const server = createServer((socket: Socket) => {
      console.log(
        `Cliente conectado a ${config.projectName}:`,
        socket.remoteAddress,
        socket.remotePort,
      );

      // Configurar timeout para el socket
      socket.setTimeout(300000); // 5 minutos

      if (!this.clientsByProject.has(config.projectName)) {
        this.clientsByProject.set(config.projectName, []);
      }
      this.clientsByProject.get(config.projectName).push(socket);

      this.connectionEvent.emit('connected');

      // Buffer para acumular datos fragmentados
      let dataBuffer = '';

      socket.on('data', async (data) => {
        try {
          const receivedData = data.toString();
          console.log(
            `Datos recibidos de ${config.projectName} (${data.length} bytes)`,
          );

          // Verificar si los datos están completos (contienen && y !!)
          const isCompleteData =
            receivedData.includes('&&') && receivedData.includes('!!');

          // Process the data
          const processedData = this.dataService.processData(receivedData);

          // Only proceed if we have data to process (non-empty dataGroup)
          if (processedData.dataGroup && processedData.dataGroup.length > 0) {
            // Actualizar el estado de procesamiento
            this.dataProcessingStatus.set(config.projectName, {
              lastProcessTime: Date.now(),
              isStuck: false,
            });

            const serializedData = JSON.stringify(processedData);

            // Enqueue the processed data
            await this.queueService.enqueueData(
              [serializedData],
              config.projectName,
            );

            // Extract XML data for broadcasting
            const xmlData = processedData.dataGroup[0]['data'];

            // Broadcast to other clients
            this.broadcastData(xmlData, socket, config.projectName);

            console.log(
              `Processed data for ${config.projectName}: ${processedData.dataGroup.length} records`,
            );
          } else {
            // Log that we're still collecting data
            console.log(`Collection of data sets for ${config.projectName}...`);

            // Verificar si estamos potencialmente bloqueados
            const status = this.dataProcessingStatus.get(config.projectName);
            const currentTime = Date.now();

            if (
              status &&
              currentTime - status.lastProcessTime > this.STUCK_THRESHOLD
            ) {
              if (!status.isStuck) {
                console.warn(
                  `Posible bloqueo en procesamiento de datos para ${config.projectName}. Último procesamiento exitoso hace ${Math.floor((currentTime - status.lastProcessTime) / 1000)} segundos.`,
                );
                status.isStuck = true;
                this.dataProcessingStatus.set(config.projectName, status);
              }
            }
          }
        } catch (error) {
          console.error(`Error en ${config.projectName}:`, error.message);
          console.error(error.stack);
        }
      });

      socket.on('timeout', () => {
        console.warn(`Socket timeout en ${config.projectName}`);
        socket.end();
      });

      socket.on('end', () => {
        console.log(`Cliente desconectado de ${config.projectName}`);
        this.removeClient(socket, config.projectName);
      });

      socket.on('error', (err) => {
        console.error(
          `Error en cliente de ${config.projectName}:`,
          err.message,
        );
        this.removeClient(socket, config.projectName);
      });
    });

    server.on('error', (err) => {
      console.error(`Error en servidor ${config.projectName}:`, err.message);
      // Intentar reiniciar el servidor después de un error
      setTimeout(() => {
        try {
          if (this.servers.has(config.projectName)) {
            const oldServer = this.servers.get(config.projectName);
            oldServer.close();
            this.servers.delete(config.projectName);
          }
          this.startServer(config);
        } catch (e) {
          console.error(
            `Error al reiniciar servidor ${config.projectName}:`,
            e.message,
          );
        }
      }, 5000);
    });

    server.listen(config.port, '0.0.0.0', () => {
      console.log(
        `Servidor TCP ${config.projectName} escuchando en puerto ${config.port}`,
      );
    });

    this.servers.set(config.projectName, server);
  }

  private removeClient(socket: Socket, projectName: string): void {
    const clients = this.clientsByProject.get(projectName) || [];
    this.clientsByProject.set(
      projectName,
      clients.filter((client) => client !== socket),
    );
    console.log(
      `Clientes activos en ${projectName}: ${this.clientsByProject.get(projectName).length}`,
    );
  }

  private broadcastData(
    data: string,
    senderSocket: Socket,
    projectName: string,
  ): void {
    const clients = this.clientsByProject.get(projectName) || [];
    let broadcastCount = 0;

    clients.forEach((client) => {
      if (client !== senderSocket && !client.destroyed) {
        client.write(data);
        broadcastCount++;
      }
    });

    if (broadcastCount > 0) {
      console.log(
        `Datos transmitidos a ${broadcastCount} clientes en ${projectName}`,
      );
    }
  }

  stopServer(): void {
    this.servers.forEach((server, projectName) => {
      const clients = this.clientsByProject.get(projectName) || [];
      clients.forEach((client) => client.destroy());
      server.close();
      console.log(`Servidor ${projectName} detenido`);
    });

    this.servers.clear();
    this.clientsByProject.clear();
  }

  private checkServiceHealth(): void {
    console.log('Verificando salud del servicio TCP...');

    // Verificar cada servidor
    this.servers.forEach((server, projectName) => {
      if (!server.listening) {
        console.warn(
          `Servidor ${projectName} no está escuchando. Intentando reiniciar...`,
        );
        try {
          server.close();
          this.servers.delete(projectName);

          // Buscar la configuración correspondiente
          const config = connections.find((c) => c.projectName === projectName);
          if (config) {
            this.startServer(config);
          }
        } catch (error) {
          console.error(
            `Error al reiniciar servidor ${projectName}:`,
            error.message,
          );
        }
      } else {
        console.log(`Servidor ${projectName} funcionando correctamente`);

        // Verificar si hay bloqueos en el procesamiento de datos
        const status = this.dataProcessingStatus.get(projectName);
        if (status && status.isStuck) {
          const timeSinceLastProcess = Date.now() - status.lastProcessTime;
          console.warn(
            `Procesamiento de datos para ${projectName} posiblemente bloqueado por ${Math.floor(timeSinceLastProcess / 1000)} segundos`,
          );

          // Si han pasado más de 5 minutos, reiniciar el servicio de datos
          if (timeSinceLastProcess > 300000) {
            console.warn(
              `Reiniciando estado de procesamiento para ${projectName} debido a bloqueo prolongado`,
            );
            this.dataProcessingStatus.set(projectName, {
              lastProcessTime: Date.now(),
              isStuck: false,
            });
          }
        }
      }
    });
  }
}
