import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registrar fuentes si es necesario, por ahora usaremos las estándar
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    color: 'grey',
    marginBottom: 20,
  },
  content: {
    textAlign: 'justify',
    marginBottom: 30,
    whiteSpace: 'pre-wrap', // Respetar saltos de línea del texto original
  },
  signatureSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
    width: '60%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  signatureImage: {
    width: 150,
    height: 60,
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: 'grey',
    textAlign: 'center',
  },
  metadata: {
    fontSize: 8,
    color: 'grey',
    marginTop: 5,
    textAlign: 'center',
  },
});

interface WaiverPDFProps {
  waiverText: string;
  signatureImage: string;
  participantName: string;
  eventName: string;
  acceptedAt: string;
  registrationId: string;
}

export const WaiverPDFDocument = ({
  waiverText,
  signatureImage,
  participantName,
  eventName,
  acceptedAt,
  registrationId,
}: WaiverPDFProps) => {
  const formattedDate = new Date(acceptedAt).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CARTA RESPONSIVA Y EXONERACIÓN</Text>
          <Text style={styles.subtitle}>Evento: {eventName}</Text>
        </View>

        <View style={styles.content}>
          <Text>{waiverText}</Text>
        </View>

        <View style={styles.signatureSection}>
          {/* La imagen debe ser base64 válida */}
          {signatureImage && (
             <Image src={signatureImage} style={styles.signatureImage} />
          )}
          <Text style={styles.signatureText}>{participantName}</Text>
          <Text style={{ fontSize: 8 }}>PARTICIPANTE</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Certificado Digital de Aceptación
          </Text>
          <Text style={styles.metadata}>
            Firmado digitalmente por {participantName} el {formattedDate}.
          </Text>
          <Text style={styles.metadata}>
            ID de Registro: {registrationId} | Plataforma: BiciRegistro.mx
          </Text>
        </View>
      </Page>
    </Document>
  );
};
