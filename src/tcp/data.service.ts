import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { create } from 'xmlbuilder2';
import { codeMap } from './code-map';

@Injectable()
export class DataService {
  private previousData = {};
  private dataBuffer = '';
  private isCollectingData = false;
  private collectionStartTime: number = 0;
  private readonly COLLECTION_TIMEOUT = 30000; // 30 segundos de timeout

  constructor(private websocketGateway: WebsocketGateway) {}

  private codeMap = codeMap;

  processData(data: string) {
    // Verificar si estamos recibiendo un nuevo bloque de datos
    if (data.trim().startsWith('&&')) {
      // Reiniciar el buffer y comenzar a recolectar
      this.isCollectingData = true;
      this.dataBuffer = data;
      this.collectionStartTime = Date.now();

      // Si el bloque ya está completo (contiene && y termina con !!)
      if (data.trim().endsWith('!!')) {
        this.isCollectingData = false;
        const completeData = this.dataBuffer;
        this.dataBuffer = '';
        return this.processDataInternal(completeData);
      }

      // Aún no está completo
      return { dataGroup: [] };
    }
    // Si ya estamos recolectando datos, añadir al buffer
    else if (this.isCollectingData) {
      // Verificar timeout
      if (Date.now() - this.collectionStartTime > this.COLLECTION_TIMEOUT) {
        console.warn(
          'Timeout en la recolección de datos. Reiniciando el estado.',
        );
        this.isCollectingData = false;
        this.dataBuffer = '';
        return { dataGroup: [] };
      }

      // Añadir al buffer
      this.dataBuffer += data;

      // Verificar si el bloque está completo
      if (this.dataBuffer.trim().endsWith('!!')) {
        this.isCollectingData = false;
        const completeData = this.dataBuffer;
        this.dataBuffer = '';
        return this.processDataInternal(completeData);
      }

      // Aún no está completo
      return { dataGroup: [] };
    }
    // Si no estamos recolectando y no es un inicio de bloque, procesar normalmente
    else {
      return this.processDataInternal(data);
    }
  }

  private processDataInternal(data: string) {
    const result = {};

    // Inicializar todas las variables en "0" en lugar de null para este bloque de datos
    Object.keys(this.codeMap).forEach((code) => {
      result[this.codeMap[code].db_name] = '0';
    });

    try {
      // Verificar que los datos tengan el formato esperado
      if (!data.includes('&&') || !data.includes('!!')) {
        console.warn(
          'Formato de datos incorrecto:',
          data.substring(0, 100) + '...',
        );
        return { dataGroup: [] };
      }

      // Extraer el contenido entre && y !!
      const contentMatch = data.match(/&&([\s\S]*?)!!/);
      if (!contentMatch || !contentMatch[1]) {
        console.warn('No se pudo extraer el contenido entre && y !!');
        return { dataGroup: [] };
      }

      const content = contentMatch[1];

      // Dividir en líneas y filtrar líneas vacías
      const lines = content
        .split('\n')
        .filter((line) => line.trim().length > 0);

      // Procesar cada línea
      for (const line of lines) {
        // Verificar que la línea tenga al menos 4 caracteres
        if (line.length < 4) continue;

        const code = line.slice(0, 4);
        const value = line.slice(4).trim();

        if (this.codeMap[code]) {
          let processedValue = value;

          // Reemplazo específico para ON_BOTTOM y SLIPS
          if (
            this.codeMap[code].db_name === 'ON_BOTTOM' ||
            this.codeMap[code].db_name === 'SLIPS'
          ) {
            processedValue = value === '1' ? 'YES' : 'NO';
          }

          result[this.codeMap[code].db_name] = processedValue;
          this.previousData[this.codeMap[code].db_name] = processedValue;
        }
      }

      // Asegurar que siempre se envíen todos los valores retenidos desde previousData
      Object.keys(this.previousData).forEach((key) => {
        if (result[key] === '0') {
          result[key] = this.previousData[key] || '0';
        }
      });

      // Obtener el nombre del pozo desde las variables de entorno
      const wellName = process.env.WELL_NAME || 'Default Well Name';
      const wellboreName = process.env.WELLBORE_NAME || 'Default Wellbore Name';

      // Generar el XML usando xmlbuilder2 de manera dinámica
      const xml = create({ version: '1.0' })
        .ele('witsml', { version: '1.4.1.1' })
        .ele('well')
        .ele('name')
        .txt(wellName)
        .up()
        .ele('wellbore')
        .ele('name')
        .txt(wellboreName)
        .up()
        .ele('log');

      // Agregar dinámicamente los elementos del resultado al XML usando wits_name
      Object.keys(this.codeMap).forEach((code) => {
        const { db_name, wits_name } = this.codeMap[code];
        if (db_name !== 'time' && db_name !== 'data') {
          xml
            .ele(wits_name, { uom: 'm' })
            .txt(result[db_name] || '0')
            .up();
        }
      });

      const xmlString = xml
        .up()
        .up()
        .up()
        .end({ prettyPrint: false, headless: true, indent: ' ' });

      // Agregar el XML al resultado
      result['data'] = xmlString;

      // Agregar la marca de tiempo al resultado
      const timestamp = new Date().toISOString();
      result['time'] = timestamp;

      const dataGroup = {
        dataGroup: [result],
        raw: data, // Agregar los datos crudos al objeto
      };

      // Emitir datos a través del WebSocket
      this.websocketGateway.emitData(dataGroup);

      // Para mantener la compatibilidad con el retorno, solo devolvemos dataGroup original
      return { dataGroup: [result] };
    } catch (error) {
      console.error('Error al procesar datos:', error);
      console.error(
        'Datos que causaron el error:',
        data.substring(0, 200) + '...',
      );
      return { dataGroup: [] };
    }
  }
}
