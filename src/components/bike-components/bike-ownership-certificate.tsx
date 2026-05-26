'use client';

import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { Bike, User, CustodyEvent } from '@/lib/types';
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
    marginBottom: 15,
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
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    padding: 5,
    marginTop: 10,
    marginBottom: 8,
    color: '#334155',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: 140,
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    fontSize: 9,
    color: '#0f172a',
  },
  hashBlock: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: 4,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  hashSubLabel: {
    fontSize: 7,
    color: '#64748b',
    marginBottom: 4,
  },
  hashValue: {
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#0f172a',
  },
  custodyBox: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px solid #f1f5f9'
  },
  custodyTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  custodyText: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 2,
  },
  bikeImage: {
    width: '100%',
    height: 200, 
    objectFit: 'contain',
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#f1f5f9'
  },
  footer: {
    position: 'absolute',
    bottom: 25,
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
    const ipPart = bike.transferIp || bike.registrationIp || 'NO_IP';
    const datePart = bike.transferredAt || bike.createdAt;
    
    // El input del hash amarra irrevocablemente al usuario actual, con su bici y el momento exacto
    const input = `${user.id}|${bike.id}|${bike.serialNumber}|${datePart}|${ipPart}|BICIREGISTRO_PROPERTY_CERTIFICATE`;
    
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

const formatDate = (isoString?: string) => {
    if (!isoString) return 'Fecha no disponible';
    return new Date(isoString).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short'
    });
};

const formatCurrency = (amount?: number) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

// --- PDF Document Component ---
const CertificateDocument = ({ bike, user, logoUrl, bikeImageUrl, hash }: { 
    bike: Bike; 
    user: User; 
    logoUrl: string; 
    bikeImageUrl?: string;
    hash: string;
}) => {
  const formattedValue = formatCurrency(bike.appraisedValue);
  
  // Logica de Trazabilidad
  const hasHistory = bike.chainOfCustody && bike.chainOfCustody.length > 0;
  
  // Datos del Creador Original (Para el bloque de origen)
  // Utilizamos los datos del snapshot original guardados en la base de datos
  const originalCreatorName = bike.originalOwnerName || 'Usuario Desconocido';
  const originalCreatorLocation = bike.originalOwnerLocation || 'Ubicación no especificada';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>BICIREGISTRO</Text>
        
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <Text style={styles.title}>CERTIFICADO DE PROPIEDAD</Text>
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.legalDisclaimerBox}>
             <Text style={styles.legalText}>
                El presente documento constituye una prueba documental privada de existencia y registro digital. El Usuario declara bajo protesta de decir verdad ser el legítimo poseedor del bien descrito. La integridad de este certificado y su fecha cierta están garantizadas mediante sellado criptográfico (Hash). Biciregistro.mx actúa como tercero de buena fe y custodio de la cadena de bloques y custodia; la veracidad de los datos origen es responsabilidad exclusiva del declarante.
            </Text>
        </View>

        {/* Owner Information */}
        <Text style={styles.sectionTitle}>PROPIETARIO ACTUAL (VIGENTE)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre completo:</Text>
          <Text style={styles.value}>{user.name} {user.lastName || ''}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ID de Usuario:</Text>
          <Text style={styles.value}>{user.id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ubicación:</Text>
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
          <Text style={styles.label}>Marca / Modelo:</Text>
          <Text style={styles.value}>{bike.make} {bike.model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Color / Modalidad:</Text>
          <Text style={styles.value}>{bike.color} / {bike.modality || 'No especificada'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Valor Declarado:</Text>
          <Text style={styles.value}>{formattedValue}</Text>
        </View>

        {/* Traceability Metadata */}
        <Text style={styles.sectionTitle}>CADENA DE CUSTODIA (HISTORIAL LEGAL)</Text>
        
        {/* Siempre mostramos el origen enriquecido */}
        <View style={styles.custodyBox}>
            <Text style={styles.custodyTitle}>Registro Original (Alta en Plataforma)</Text>
            <Text style={styles.custodyText}>Fecha y Hora: {formatDate(bike.createdAt)}</Text>
            <Text style={styles.custodyText}>Registrado por: {originalCreatorName} ({bike.originalOwnerId || bike.userId})</Text>
            <Text style={styles.custodyText}>Ubicación: {originalCreatorLocation}</Text>
            <Text style={styles.custodyText}>IP del Dispositivo: {bike.registrationIp || 'No disponible'}</Text>
        </View>

        {/* Soporte Legacy para la primera transferencia si no está en el chainOfCustody */}
        {/* Si existe transferredAt pero no hay chainOfCustody, O si la primera fecha del chainOfCustody NO coincide con transferredAt */}
        {bike.transferredAt && (!hasHistory || (hasHistory && new Date(bike.chainOfCustody![0].date).getTime() > new Date(bike.transferredAt).getTime() + 1000)) && (
            <View style={styles.custodyBox}>
                <Text style={styles.custodyTitle}>Transacción {hasHistory ? 'previa' : '1'}: Cambio de Propietario (Legacy)</Text>
                <Text style={styles.custodyText}>Fecha de Transferencia: {formatDate(bike.transferredAt)}</Text>
                {bike.previousOwnerId && <Text style={styles.custodyText}>Emisor (ID): {bike.previousOwnerId}</Text>}
                {bike.transferIp && <Text style={styles.custodyText}>IP de Transacción: {bike.transferIp}</Text>}
            </View>
        )}

        {/* Iteramos sobre el historial moderno de transferencias si existe */}
        {hasHistory && bike.chainOfCustody!.map((event: CustodyEvent, index: number) => (
            <View key={index} style={styles.custodyBox}>
                <Text style={styles.custodyTitle}>Transacción {bike.transferredAt && !hasHistory ? index + 2 : index + 1}: Cambio de Propietario (Digital)</Text>
                <Text style={styles.custodyText}>Fecha de Transferencia: {formatDate(event.date)}</Text>
                <Text style={styles.custodyText}>Emisor: {event.previousOwnerName || 'Usuario'} ({event.previousOwnerId})</Text>
                <Text style={styles.custodyText}>Receptor: {event.ownerName || 'Usuario'} ({event.ownerId})</Text>
                {event.saleAmount ? <Text style={styles.custodyText}>Monto Declarado: {formatCurrency(event.saleAmount)}</Text> : null}
                <Text style={styles.custodyText}>Ubicación Reportada: {event.location || 'No especificada'}</Text>
                <Text style={styles.custodyText}>IP de Transacción: {event.ipAddress}</Text>
            </View>
        ))}

        {/* Hash Block visualmente rediseñado (Salto de linea) */}
        <View style={styles.hashBlock}>
            <Text style={styles.hashLabel}>SELLO CRIPTOGRÁFICO DE INTEGRIDAD</Text>
            <Text style={styles.hashSubLabel}>Generado contra estado actual para validación pericial (SHA-256)</Text>
            <Text style={styles.hashValue}>{hash}</Text>
        </View>

        {/* Bike Photo */}
        {bikeImageUrl && (
            <View wrap={false}> 
                <Text style={styles.sectionTitle}>FOTOGRAFÍA DE REFERENCIA</Text>
                <Image src={bikeImageUrl} style={styles.bikeImage} />
            </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento certifica que la bicicleta descrita se encuentra registrada en la plataforma BiciRegistro.mx.
          </Text>
          <Text style={styles.footerText}>
            Para validar la autenticidad de este certificado y su cadena de custodia, escanee el código QR físico de la bicicleta o contacte a soporte@biciregistro.mx
          </Text>
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
            
            const hash = await generateSecureHash(bike, user);
            
            let bikeImageUrl = undefined;
            if (bike.photos && bike.photos.length > 0) {
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
    <Button 
        id="tour-bike-certificate"
        variant="outline" 
        onClick={handleDownload} 
        disabled={loading} 
        className={cn("w-full", className)}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Generando...' : 'Descargar Certificado de Propiedad'}
    </Button>
  );
}
