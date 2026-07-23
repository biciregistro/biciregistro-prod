import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { WaiverDetails } from '@/lib/actions/waiver-actions';

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
    whiteSpace: 'pre-wrap',
  },
  signatureSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
    width: '70%',
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
  signatureLabel: {
      fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 5,
  },
  footerText: {
    fontSize: 8,
    color: 'grey',
    textAlign: 'center',
    marginBottom: 2,
  },
  metadata: {
    fontSize: 7,
    color: 'grey',
    marginTop: 1,
    textAlign: 'center',
  },
  hashText: {
    fontSize: 6,
    color: '#999',
    marginTop: 1,
    textAlign: 'center',
    fontFamily: 'Courier',
  }
});

type WaiverPDFProps = {
    details: WaiverDetails;
};

export const WaiverPDFDocument = ({ details }: WaiverPDFProps) => {
  const {
    waiverText,
    signatureImage,
    participant,
    tutor,
    event,
    acceptedAt,
    registrationId,
    waiverIp,
    waiverHash,
    isTutorFlow,
  } = details;

  const formattedDate = new Date(acceptedAt).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'medium',
  });

  const participantFullName = `${participant.name} ${participant.lastName}`.trim();
  const tutorFullName = tutor ? `${tutor.name} ${tutor.lastName}`.trim() : '';

  const signatureName = isTutorFlow ? tutorFullName : participantFullName;
  const signatureLabel = isTutorFlow ? `TUTOR DE: ${participantFullName}` : 'PARTICIPANTE';
  const footerSignee = isTutorFlow ? `${tutorFullName} (en representación de ${participantFullName})` : participantFullName;


  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CARTA RESPONSIVA Y EXONERACIÓN</Text>
          <Text style={styles.subtitle}>Evento: {event.name}</Text>
        </View>

        <View style={styles.content}>
          <Text>{waiverText}</Text>
        </View>

        <View style={styles.signatureSection}>
          {signatureImage && (
             <Image src={signatureImage} style={styles.signatureImage} />
          )}
          <Text style={styles.signatureText}>{signatureName}</Text>
          <Text style={styles.signatureLabel}>{signatureLabel}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Certificado Digital de Aceptación
          </Text>
          <Text style={styles.metadata}>
            Firmado digitalmente por {footerSignee} el {formattedDate}.
          </Text>
          <Text style={styles.metadata}>
            ID de Registro: {registrationId} | Plataforma: BiciRegistro.mx
          </Text>
          
          <Text style={styles.metadata}>
            IP de Origen: {waiverIp || 'No registrada (Firma anterior)'}
          </Text>
          <Text style={styles.hashText}>
             Huella Digital (Hash SHA-256): {waiverHash || 'No generado (Firma anterior)'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
