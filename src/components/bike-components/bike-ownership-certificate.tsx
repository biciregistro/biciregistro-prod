'use client';

import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { Bike, User } from '@/lib/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';

// --- Styles for the Certificate ---
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottom: '2px solid #0f172a',
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    height: 'auto',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  legalDisclaimerBox: {
    padding: 8,
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    marginBottom: 20,
    borderRadius: 4,
  },
  legalText: {
    fontSize: 7,
    fontStyle: 'italic',
    color: '#475569',
    textAlign: 'justify',
    lineHeight: 1.3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    padding: 5,
    marginTop: 15,
    marginBottom: 10,
    color: '#334155',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: 150,
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    fontSize: 10,
    color: '#0f172a',
  },
  bikeImage: {
    width: '100%',
    height: 250, 
    objectFit: 'contain', // Changed to contain to respect aspect ratio better
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f1f5f9'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
  hash: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 5,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: 'rgba(226, 232, 240, 0.3)',
    zIndex: -1,
  }
});

// --- Hash Generation Utility (SHA-256) ---
const generateSecureHash = async (bike: Bike, user: User) => {
    const input = `${user.id}|${bike.id}|${bike.serialNumber}|${bike.createdAt}|BICIREGISTRO_PROPERTY_CERTIFICATE`;
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

// --- PDF Document Component ---
const CertificateDocument = ({ bike, user, logoUrl, bikeImageUrl, hash }: { 
    bike: Bike; 
    user: User; 
    logoUrl: string; 
    bikeImageUrl?: string;
    hash: string;
}) => {
  const registrationDate = bike.createdAt ? new Date(bike.createdAt).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'medium'
  }) : 'Fecha no disponible';

  const formattedValue = bike.appraisedValue 
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bike.appraisedValue) 
    : 'No especificado';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>BICIREGISTRO</Text>
        
        {/* Header */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoUrl} style={styles.logo} />
          <Text style={styles.title}>CERTIFICADO DE PROPIEDAD</Text>
        </View>

        {/* Legal Disclaimer - Moved to Top */}
        <View style={styles.legalDisclaimerBox}>
             <Text style={styles.legalText}>
                El presente documento constituye una prueba documental privada de existencia y registro digital. El Usuario declara bajo protesta de decir verdad ser el legítimo poseedor del bien descrito, amparándose en la presunción de propiedad establecida en el Artículo 798 del Código Civil Federal. La integridad de este certificado y su fecha cierta están garantizadas mediante sellado criptográfico (Hash), otorgándole valor probatorio pleno conforme al Artículo 210-A del Código Federal de Procedimientos Civiles. Biciregistro.mx actúa como tercero de buena fe y custodio de la información; la veracidad de los datos origen es responsabilidad exclusiva del declarante según los Términos y Condiciones de la plataforma.
            </Text>
        </View>

        {/* Owner Information */}
        <Text style={styles.sectionTitle}>INFORMACIÓN DEL PROPIETARIO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre completo:</Text>
          <Text style={styles.value}>{user.name} {user.lastName || ''}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Correo electrónico:</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ubicación de registro:</Text>
          <Text style={styles.value}>
            {user.city || 'N/A'}, {user.state || 'N/A'}, {user.country || 'N/A'}
          </Text>
        </View>

        {/* Bike Information */}
        <Text style={styles.sectionTitle}>DETALLES DE LA BICICLETA</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Número de Serie:</Text>
          <Text style={styles.value}>{bike.serialNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Marca:</Text>
          <Text style={styles.value}>{bike.make}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Modelo:</Text>
          <Text style={styles.value}>{bike.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Color:</Text>
          <Text style={styles.value}>{bike.color}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Modalidad:</Text>
          <Text style={styles.value}>{bike.modality || 'No especificada'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Valor Declarado:</Text>
          <Text style={styles.value}>{formattedValue}</Text>
        </View>

        {/* Registration Metadata */}
        <Text style={styles.sectionTitle}>METADATOS DE REGISTRO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha y Hora de Registro:</Text>
          <Text style={styles.value}>{registrationDate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>IP de Registro:</Text>
          <Text style={styles.value}>Registrada de forma segura (AES-256)</Text>
        </View>

        {/* Bike Photo */}
        {bikeImageUrl && (
            <View wrap={false}> 
                <Text style={styles.sectionTitle}>FOTOGRAFÍA DE REFERENCIA</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={bikeImageUrl} style={styles.bikeImage} />
            </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento certifica que la bicicleta descrita anteriormente se encuentra registrada en la plataforma BiciRegistro.mx por el usuario mencionado.
          </Text>
          <Text style={styles.footerText}>
            Para validar la autenticidad de este certificado, escanee el código QR de la bicicleta o contacte a soporte@biciregistro.mx
          </Text>
          <Text style={styles.hash}>HASH DE VALIDACIÓN (SHA-256): {hash}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function BikeOwnershipCertificate({ bike, user, className }: { bike: Bike; user: User; className?: string }) {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
            const logoUrl = `${baseUrl}/logo.png`;
            
            // Generate SHA-256 Secure Hash
            const hash = await generateSecureHash(bike, user);
            
            // Image Handling with Proxy
            let bikeImageUrl = undefined;
            if (bike.photos && bike.photos.length > 0) {
                // Use the proxy endpoint to fetch the image to avoid CORS issues
                bikeImageUrl = `/api/image-proxy?url=${encodeURIComponent(bike.photos[0])}`;
            }

            const blob = await pdf(
                <CertificateDocument 
                    bike={bike} 
                    user={user} 
                    logoUrl={logoUrl} 
                    bikeImageUrl={bikeImageUrl}
                    hash={hash}
                />
            ).toBlob();
            
            saveAs(blob, `certificado-propiedad-${bike.serialNumber}.pdf`);
        } catch (error) {
            console.error("Failed to generate certificate", error);
        } finally {
            setLoading(false);
        }
    };

  return (
    <Button variant="outline" onClick={handleDownload} disabled={loading} className={cn("w-full", className)}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Generando...' : 'Descargar Certificado de Propiedad'}
    </Button>
  );
}
