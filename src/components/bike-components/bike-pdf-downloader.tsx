'use client';

import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Bike } from '@/lib/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

// --- Redesigned Styles ---
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 10,
  },
  tagContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  logoImage: {
    width: 85,
    height: 23.5,
    marginBottom: 12,
  },
  qrImage: {
    width: 90,
    height: 90,
    padding: 5,
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
  },
  serialContainer: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    width: '95%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serialNumber: {
    fontSize: 8,
    fontFamily: 'Courier',
    letterSpacing: 0.8,
    textAlign: 'left',
    color: '#0f172a',
  },
  legend: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    textAlign: 'center',
    color: '#64748b',
    position: 'absolute',
    bottom: 8,
  },
});

// --- Pure PDF Document Component ---
const BikePDFTag = ({ bike, qrCodeUrl, logoUrl }: { bike: Bike; qrCodeUrl: string; logoUrl: string }) => {
  return (
    <Document>
      <Page size={[170.08, 255.12]} style={styles.page}>
        <View style={styles.tagContainer}>
          <Image style={styles.logoImage} src={logoUrl} />
          <Image style={styles.qrImage} src={qrCodeUrl} />
          <View style={styles.serialContainer}>
             <Text style={styles.serialNumber}>{bike.serialNumber}</Text>
          </View>
          <Text style={styles.legend}>Bicicleta protegida con BicRegistro</Text>
        </View>
      </Page>
    </Document>
  );
};

// --- Download Button Component (the default export) ---
export default function BikePDFDownloader({ bike, className }: { bike: Bike, className?: string }) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
            const bikeUrl = `${baseUrl}/bikes/${bike.serialNumber}`;
            const qrCodeUrl = await QRCode.toDataURL(bikeUrl, { 
                errorCorrectionLevel: 'H',
                margin: 2,
             });
            const logoUrl = `${baseUrl}/logo.png`;

            const blob = await pdf(<BikePDFTag bike={bike} qrCodeUrl={qrCodeUrl} logoUrl={logoUrl} />).toBlob();
            
            saveAs(blob, `etiqueta-BiciRegistro-${bike.serialNumber}.pdf`);
        } catch (error) {
            console.error("Failed to generate and download PDF", error);
        } finally {
            setLoading(false);
        }
    };

  return (
    <Button variant="default" onClick={handleDownload} disabled={loading} className={cn(className)}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Generando...' : 'Descargar Etiqueta'}
    </Button>
  );
}
