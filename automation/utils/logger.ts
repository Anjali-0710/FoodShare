import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

const logDir = path.resolve(__dirname, '../logs');
fs.ensureDirSync(logDir);

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDir, 'execution.log') })
  ]
});
