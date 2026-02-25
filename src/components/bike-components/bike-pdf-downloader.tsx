'use client';

import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Bike } from '@/lib/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    border: '2px solid #000000', 
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: '#FACC15', 
    paddingVertical: 10,
    paddingHorizontal: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 80,
    height: 22,
    marginBottom: 4,
  },
  headerStatus: {
    fontSize: 7,
    color: '#000000', 
    fontFamily: 'Helvetica',
    letterSpacing: 0.5, 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  body: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  qrWrapper: {
    padding: 6,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  scanText: {
    fontSize: 6,
    color: '#64748b',
    fontFamily: 'Helvetica',
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  serialLabel: {
    fontSize: 6,
    color: '#94a3b8',
    fontFamily: 'Helvetica',
    marginBottom: 2,
  },
  serialNumber: {
    fontSize: 9,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    letterSpacing: 1,
    color: '#0f172a',
    textAlign: 'center',
  },
  securityStrip: {
    height: 4,
    width: '100%',
    backgroundColor: '#ef4444', 
    position: 'absolute',
    bottom: 0,
  }
});

const BikePDFTag = ({ bike, qrCodeUrl, logoUrl }: { bike: Bike; qrCodeUrl: string; logoUrl: string }) => {
  return (
    <Document>
      <Page size={[180, 252]} style={styles.page}>
        <View style={styles.tagContainer}>
          <View style={styles.header}>
            <Image style={styles.logoImage} src={logoUrl} />
            <Text style={styles.headerStatus}>BICICLETA RASTREADA POR GPS</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.qrWrapper}>
                <Image style={styles.qrImage} src={qrCodeUrl} />
            </View>
            <Text style={styles.scanText}>ESCANEAR PARA VERIFICAR ESTATUS</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.serialLabel}>NÚMERO DE SERIE</Text>
            <Text style={styles.serialNumber}>{bike.serialNumber}</Text>
          </View>

          <View style={styles.securityStrip} />
        </View>
      </Page>
    </Document>
  );
};

export default function BikePDFDownloader({ bike, className }: { bike: Bike, className?: string }) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
            const bikeUrl = `${baseUrl}/bikes/${bike.serialNumber}`;
            const qrCodeUrl = await QRCode.toDataURL(bikeUrl, { 
                errorCorrectionLevel: 'H',
                margin: 1,
             });
            
            const logoUrl = `${baseUrl}/logo.png`; 

            const blob = await pdf(<BikePDFTag bike={bike} qrCodeUrl={qrCodeUrl} logoUrl={logoUrl} />).toBlob();
            
            saveAs(blob, `etiqueta-seguridad-${bike.serialNumber}.pdf`);
        } catch (error) {
            console.error("Failed to generate and download PDF", error);
        } finally {
            setLoading(false);
        }
    };

  return (
    <Button 
        id="tour-bike-qr"
        variant="default" 
        onClick={handleDownload} 
        disabled={loading} 
        className={cn("w-full", className)}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Generando...' : 'Descargar Etiqueta QR'}
    </Button>
  );
}
