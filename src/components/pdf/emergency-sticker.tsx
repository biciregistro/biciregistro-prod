'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    width: 142, 
    height: 142,
    borderWidth: 2,       
    borderStyle: 'solid', 
    borderColor: '#EF4444', 
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    padding: 4,
  },
  header: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  qrCode: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  footer: {
    fontSize: 6,
    color: '#000000',
    textAlign: 'center',
    marginTop: 2,
  },
});

interface EmergencyPDFProps {
  qrDataUrl: string;
  userName: string;
}

export const EmergencyPDFDocument = ({ qrDataUrl, userName }: EmergencyPDFProps) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.header}>Emergencia Médica</Text>
        {qrDataUrl && <Image src={qrDataUrl} style={pdfStyles.qrCode} />}
        <Text style={{ fontSize: 7, fontWeight: 'bold' }}>ESCANEAR EN CASO DE ACCIDENTE</Text>
        <Text style={pdfStyles.footer}>{userName}</Text>
      </View>
    </Page>
  </Document>
);
