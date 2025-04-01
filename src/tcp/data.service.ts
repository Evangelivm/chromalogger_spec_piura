import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { codeMap } from './code-map';
import { create } from 'xmlbuilder2';

@Injectable()
export class DataService {
  private previousData = {};
  private dataBuffer = '';
  private isCollectingGroups = false;
  private groupCount = 0;

  constructor(private websocketGateway: WebsocketGateway) {}

  private codeMap = codeMap;

  processData(data: string) {
    // Check if we're already collecting groups or if this is a new group
    if (!this.isCollectingGroups && data.trim().startsWith('&&')) {
      this.isCollectingGroups = true;
      this.dataBuffer = '';
      this.groupCount = 0;
    }

    if (this.isCollectingGroups) {
      // Add the current data to our buffer
      this.dataBuffer += data;

      // Count the number of groups in this batch
      const matches = data.match(/&&/g);
      if (matches) {
        this.groupCount += matches.length;
      }

      // Check if we've reached the end of a group
      const endMatches = data.match(/!!/g);
      if (endMatches) {
        // Reduce the group count by the number of end markers
        this.groupCount -= endMatches.length;
      }

      // If we've collected all groups (all have been closed), process the combined data
      if (this.groupCount <= 0 && this.dataBuffer.trim().endsWith('!!')) {
        const combinedData = this.dataBuffer;
        this.isCollectingGroups = false;
        this.dataBuffer = '';

        // Process the combined data
        return this.processDataInternal(combinedData);
      }

      // Still collecting groups, return empty result for now
      return { dataGroup: [] };
    } else {
      // Process data normally if it's not part of a group structure
      return this.processDataInternal(data);
    }
  }

  private processDataInternal(data: string) {
    const result = {};

    // Inicializar todas las variables en "0" en lugar de null para este bloque de datos
    Object.keys(this.codeMap).forEach((code) => {
      result[this.codeMap[code].db_name] = '0';
    });

    // Extract all lines from all groups
    const allLines = [];
    const groups = data.split('&&');

    for (let group of groups) {
      if (group.trim() === '') continue;

      // Remove the ending !! if present
      group = group.replace('!!', '');

      // Get lines from this group
      const lines = group.split('\n').filter((line) => line.trim().length > 0);
      allLines.push(...lines);
    }

    // Process all lines from all groups
    for (const line of allLines) {
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
  }
}
