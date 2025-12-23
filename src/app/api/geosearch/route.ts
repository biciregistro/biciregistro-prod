import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'BiciRegistroApp/1.0 (contacto@biciregistro.mx)',
        'Accept-Language': 'es-MX,es;q=0.9'
      }
    });

    if (!response.ok) {
        throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transformamos la data al formato que leaflet-geosearch espera si es necesario, 
    // pero OpenStreetMapProvider suele parsear la respuesta standard de Nominatim.
    return NextResponse.json(data);

  } catch (error) {
    console.error('Geosearch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch location data' }, { status: 500 });
  }
}
