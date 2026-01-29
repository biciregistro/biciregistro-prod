
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Seguridad: Validar que la imagen viene de nuestros dominios confiables (Firebase Storage)
  // Ajusta esto si usas otros dominios
  if (!imageUrl.includes('firebasestorage.googleapis.com') && !imageUrl.includes('googleusercontent.com')) {
     return new NextResponse('Forbidden domain', { status: 403 });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        // Cachear la imagen para mejorar rendimiento en generaciones subsecuentes
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
