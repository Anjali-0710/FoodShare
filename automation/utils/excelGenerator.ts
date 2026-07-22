import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs-extra';
import { logger } from './logger';

export class ExcelGenerator {
  static async generate(testCases: any[], outputDir: string): Promise<string> {
    fs.ensureDirSync(outputDir);
    const filePath = path.join(outputDir, 'Automation_Test_Report.xlsx');
    const workbook = new ExcelJS.Workbook();

    const passed = testCases.filter(t => t.status === 'Passed');
    const failed = testCases.filter(t => t.status === 'Failed');
    const skipped = testCases.filter(t => t.status === 'Skipped');
    const totalCount = testCases.length;
    const passedCount = passed.length;
    const failedCount = failed.length;
    const skippedCount = skipped.length;
    const passRate = ((passedCount / (totalCount - skippedCount)) * 100).toFixed(2) + '%';

    // Helper to style header row
    const styleHeader = (row: ExcelJS.Row, colorHex: string = '22C55E') => {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorHex }
        };
        cell.font = {
          color: { argb: 'FFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      row.height = 25;
    };

    // Helper to style data row status cell
    const styleStatusCell = (cell: ExcelJS.Cell) => {
      const val = cell.value?.toString().toUpperCase();
      if (val === 'PASSED') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } };
        cell.font = { color: { argb: '15803D' }, bold: true };
      } else if (val === 'FAILED') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } };
        cell.font = { color: { argb: 'B91C1C' }, bold: true };
      } else if (val === 'SKIPPED') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
        cell.font = { color: { argb: 'B45309' }, bold: true };
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 1: Executed Test Cases
    // ─────────────────────────────────────────────────────────────────────────
    const sheet1 = workbook.addWorksheet('Executed Test Cases');
    sheet1.columns = [
      { header: 'Test ID', key: 'id', width: 15 },
      { header: 'Module', key: 'module', width: 22 },
      { header: 'Test Name', key: 'name', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Execution Time (ms)', key: 'executionTimeMs', width: 20 }
    ];
    styleHeader(sheet1.getRow(1));
    testCases.forEach(t => {
      const r = sheet1.addRow(t);
      styleStatusCell(r.getCell('status'));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 2: Passed Tests
    // ─────────────────────────────────────────────────────────────────────────
    const sheet2 = workbook.addWorksheet('Passed Tests');
    sheet2.columns = [
      { header: 'Test ID', key: 'id', width: 15 },
      { header: 'Module', key: 'module', width: 22 },
      { header: 'Test Name', key: 'name', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Execution Time (ms)', key: 'executionTimeMs', width: 20 }
    ];
    styleHeader(sheet2.getRow(1), '10B981');
    passed.forEach(t => {
      const r = sheet2.addRow(t);
      styleStatusCell(r.getCell('status'));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 3: Failed Tests
    // ─────────────────────────────────────────────────────────────────────────
    const sheet3 = workbook.addWorksheet('Failed Tests');
    sheet3.columns = [
      { header: 'Test ID', key: 'id', width: 15 },
      { header: 'Module', key: 'module', width: 22 },
      { header: 'Test Name', key: 'name', width: 35 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Failure Reason', key: 'failureReason', width: 50 }
    ];
    styleHeader(sheet3.getRow(1), 'EF4444');
    failed.forEach(t => {
      const r = sheet3.addRow(t);
      styleStatusCell(r.getCell('status'));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 4: Skipped Tests
    // ─────────────────────────────────────────────────────────────────────────
    const sheet4 = workbook.addWorksheet('Skipped Tests');
    sheet4.columns = [
      { header: 'Test ID', key: 'id', width: 15 },
      { header: 'Module', key: 'module', width: 22 },
      { header: 'Test Name', key: 'name', width: 35 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Reason', key: 'failureReason', width: 50 }
    ];
    styleHeader(sheet4.getRow(1), 'F59E0B');
    skipped.forEach(t => {
      const r = sheet4.addRow(t);
      styleStatusCell(r.getCell('status'));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 5: Execution Metrics
    // ─────────────────────────────────────────────────────────────────────────
    const sheet5 = workbook.addWorksheet('Execution Metrics');
    sheet5.columns = [
      { header: 'Metric Name', key: 'metric', width: 25 },
      { header: 'Value', key: 'val', width: 15 }
    ];
    styleHeader(sheet5.getRow(1), '3B82F6');
    sheet5.addRow({ metric: 'Total Test Cases', val: totalCount });
    sheet5.addRow({ metric: 'Passed Test Cases', val: passedCount });
    sheet5.addRow({ metric: 'Failed Test Cases', val: failedCount });
    sheet5.addRow({ metric: 'Skipped Test Cases', val: skippedCount });
    sheet5.addRow({ metric: 'Pass Rate (%)', val: passRate });

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 6: Defect Summary
    // ─────────────────────────────────────────────────────────────────────────
    const sheet6 = workbook.addWorksheet('Defect Summary');
    sheet6.columns = [
      { header: 'Defect ID', key: 'defectId', width: 15 },
      { header: 'Associated Test Case', key: 'testId', width: 20 },
      { header: 'Module', key: 'module', width: 22 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Failure Root Cause / Error Stack', key: 'reason', width: 60 }
    ];
    styleHeader(sheet6.getRow(1), '8B5CF6');
    failed.forEach((t, idx) => {
      sheet6.addRow({
        defectId: `DEF_${String(idx + 1).padStart(3, '0')}`,
        testId: t.id,
        module: t.module,
        severity: t.priority === 'High' ? 'Critical' : 'Major',
        reason: t.failureReason || 'Assertion mismatch'
      });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sheet 7: Pass Rate Summary
    // ─────────────────────────────────────────────────────────────────────────
    const sheet7 = workbook.addWorksheet('Pass Rate Summary');
    sheet7.columns = [
      { header: 'Status Key', key: 'status', width: 20 },
      { header: 'Quantity', key: 'qty', width: 15 },
      { header: 'Percentage', key: 'pct', width: 15 }
    ];
    styleHeader(sheet7.getRow(1), 'EC4899');
    sheet7.addRow({ status: 'Passed', qty: passedCount, pct: ((passedCount / totalCount) * 100).toFixed(2) + '%' });
    sheet7.addRow({ status: 'Failed', qty: failedCount, pct: ((failedCount / totalCount) * 100).toFixed(2) + '%' });
    sheet7.addRow({ status: 'Skipped', qty: skippedCount, pct: ((skippedCount / totalCount) * 100).toFixed(2) + '%' });

    await workbook.xlsx.writeFile(filePath);
    logger.info(`Excel report written successfully: ${filePath}`);
    
    // Also write separate file artifacts for passed/failed/summary sheets
    const summaryWb = new ExcelJS.Workbook();
    const summarySheet = summaryWb.addWorksheet('Execution Summary');
    summarySheet.columns = [{ header: 'Metric', key: 'metric', width: 25 }, { header: 'Value', key: 'val', width: 15 }];
    styleHeader(summarySheet.getRow(1), '22C55E');
    summarySheet.addRow({ metric: 'Total Tests', val: totalCount });
    summarySheet.addRow({ metric: 'Passed', val: passedCount });
    summarySheet.addRow({ metric: 'Failed', val: failedCount });
    summarySheet.addRow({ metric: 'Skipped', val: skippedCount });
    summarySheet.addRow({ metric: 'Pass Rate', val: passRate });
    await summaryWb.xlsx.writeFile(path.join(outputDir, 'Execution_Summary.xlsx'));

    const passedWb = new ExcelJS.Workbook();
    const pSheet = passedWb.addWorksheet('Passed Tests');
    pSheet.columns = sheet2.columns;
    styleHeader(pSheet.getRow(1), '22C55E');
    passed.forEach(t => pSheet.addRow(t));
    await passedWb.xlsx.writeFile(path.join(outputDir, 'Passed_Test_Cases.xlsx'));

    const failedWb = new ExcelJS.Workbook();
    const fSheet = failedWb.addWorksheet('Failed Tests');
    fSheet.columns = sheet3.columns;
    styleHeader(fSheet.getRow(1), 'EF4444');
    failed.forEach(t => fSheet.addRow(t));
    await failedWb.xlsx.writeFile(path.join(outputDir, 'Failed_Test_Cases.xlsx'));

    return filePath;
  }
}
