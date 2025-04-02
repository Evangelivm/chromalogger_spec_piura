export const codeMap = {
  // Datos operacionales
  '0113': { db_name: 'ROP', wits_name: 'Rop', unit: 'm/h' },
  '0116': { db_name: 'WOB', wits_name: 'Wob', unit: 'klb' },
  '0121': { db_name: 'PUMP_PRESSURE', wits_name: 'Pump_Pressure', unit: 'psi' },
  '0123': {
    db_name: 'PUMP_STK_R_1',
    wits_name: 'Pump_Stroke_Rate_1',
    unit: 'spm',
  },
  '0125': {
    db_name: 'PUMP_STK_R_3',
    wits_name: 'Pump_Stroke_Rate_3',
    unit: 'spm',
  },
  '0124': {
    db_name: 'PUMP_STK_R_2',
    wits_name: 'Pump_Stroke_Rate_2',
    unit: 'spm',
  },
  '0139': { db_name: 'LAG_DEPTH', wits_name: 'Lag_Depth', unit: 'm' },
  '0108': { db_name: 'BIT_M_DEPTH', wits_name: 'Bit_Meas_Depth', unit: 'm' },
  '0110': {
    db_name: 'TOT_M_DEPTH',
    wits_name: 'Total_Meas_Depth',
    unit: 'm',
  },
  '0112': { db_name: 'BLOCK_POSITION', wits_name: 'Block_Position', unit: 'm' },
  '0114': { db_name: 'HOOKLOAD', wits_name: 'Hookload', unit: 'klb' },
  '0130': { db_name: 'MUD_FLOW_IN', wits_name: 'Mud_Flow_In', unit: 'lpm' },
  '0129': {
    db_name: 'MUD_FLOW_OUT_PER',
    wits_name: 'Mud_Flow_Out_Percentage',
    unit: '%',
  },
  '0131': {
    db_name: 'MUD_DEN_OUT',
    wits_name: 'Mud_Density_Out',
    unit: 'kg/m³',
  },
  '0133': { db_name: 'MUD_TEMP_OUT', wits_name: 'Mud_Temp_Out', unit: '°C' },
  '0120': { db_name: 'RPM', wits_name: 'Rpm', unit: 'rpm' },
  '0118': {
    db_name: 'ROT_TORQ_AMP',
    wits_name: 'Rotary_Torque_Amps',
    unit: 'A',
  },
  '0174': { db_name: 'RPM_MOTOR', wits_name: 'Rpm_Del_Motor', unit: 'rpm' },
  '0166': {
    db_name: 'BIT_DR_TIME',
    wits_name: 'Bit_Drill_Time',
    unit: 'hours',
  },

  // Volúmenes y bombas
  '1116': {
    db_name: 'VOL_TANK_INT',
    wits_name: 'Volumen_Tank_Intermedio',
    unit: 'm³',
  },
  '1117': {
    db_name: 'VOL_TANK_SUCCION',
    wits_name: 'Volumen_Tank_Succion',
    unit: 'm³',
  },
  '1115': {
    db_name: 'VOL_TANK_RET',
    wits_name: 'Volumen_Tank_Retorno',
    unit: 'm³',
  },
  '0141': {
    db_name: 'VOL_TANK_RES',
    wits_name: 'Volumen_Tank_Reserva',
    unit: 'm³',
  },
  '0126': {
    db_name: 'VOL_TOTAL_ACT',
    wits_name: 'Volumen_Total_Activo',
    unit: 'm³',
  },
  '0172': {
    db_name: 'VOL_TOTAL_LOD_BOMB',
    wits_name: 'Volumen_Total_De_Lodo_Bombeado',
    unit: 'm³',
  },
  '0146': {
    db_name: 'TOTAL_PUMP_VOL',
    wits_name: 'Total_Pumped_Volume',
    unit: 'm³',
  },
  '0153': {
    db_name: 'P_STK_C_B_1',
    wits_name: 'Pump_Stroke_Count_Bomba_1',
    unit: 'strokes',
  },
  '0154': {
    db_name: 'P_STK_C_B_2',
    wits_name: 'Pump_Stroke_Count_Bomba_2',
    unit: 'strokes',
  },
  '0155': {
    db_name: 'P_STK_C_B_3',
    wits_name: 'Pump_Stroke_Count_Bomba_3',
    unit: 'strokes',
  },
  '0137': {
    db_name: 'TOTAL_STK',
    wits_name: 'Total_Strokes',
    unit: 'strokes',
  },

  '0138': { db_name: 'LAG_STROKES', wits_name: 'Lag_Strokes', unit: 'strokes' },

  // Datos cromatográficos (gas)
  '0140': { db_name: 'TOTAL_GAS', wits_name: 'Total_Gas', unit: 'ppm' },
  '1212': { db_name: 'METHANE_C1', wits_name: 'Methane_C1', unit: 'ppm' },
  '1213': { db_name: 'ETHANE_C2', wits_name: 'Ethane_C2', unit: 'ppm' },
  '1214': { db_name: 'PROPANE_C3', wits_name: 'Propane_C3', unit: 'ppm' },
  '1215': { db_name: 'ISOBUTANE_C4I', wits_name: 'Isobutane_C4I', unit: 'ppm' },
  '1216': {
    db_name: 'NOR_BUT_C4N',
    wits_name: 'Nor_Butane_C4N',
    unit: 'ppm',
  },
  '1218': { db_name: 'NOR_PENTANE', wits_name: 'Nor_Pentane', unit: 'ppm' },
  '1217': {
    db_name: 'ISO_PENT_C5I',
    wits_name: 'Iso_Pentane_C5I',
    unit: 'ppm',
  },
  '1424': { db_name: 'H2S', wits_name: 'H2S', unit: 'ppm' },
  '1222': {
    db_name: 'CARB_DIOX',
    wits_name: 'Carbon_Dioxide',
    unit: 'ppm',
  },

  // Tiempos y otros
  '0173': { db_name: 'LAG_TIME', wits_name: 'Lag_Time', unit: 'min' },
  '0127': { db_name: 'GAIN_LOSS', wits_name: 'Gain_Loss', unit: 'm³' },
  '0175': { db_name: 'UNKN_2', wits_name: 'Unknown_2', unit: 'm' },
  '0160': { db_name: 'UNKN_3', wits_name: 'Unknown_3', unit: 'm' },
  '1208': { db_name: 'UNKN_1', wits_name: 'Unknown_1', unit: 'm' },
};
