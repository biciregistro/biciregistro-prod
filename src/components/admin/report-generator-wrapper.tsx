'use client';

import dynamic from 'next/dynamic';

const DynamicReportGeneratorButton = dynamic(
  () => import('./report-generator-button').then((mod) => mod.ReportGeneratorButton),
  { ssr: false }
);

interface ReportGeneratorWrapperProps {
  dashboardData: any;
}

export function ReportGeneratorWrapper({ dashboardData }: ReportGeneratorWrapperProps) {
  return <DynamicReportGeneratorButton dashboardData={dashboardData} />;
}
