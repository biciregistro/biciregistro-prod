import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('--- ESTE ES UN MENSAJE DE PRUEBA DEL SERVIDOR ---');
  console.log('--- SI VES ESTO, LA TERMINAL ESTÁ FUNCIONANDO CORRECTAMENTE ---');
  return NextResponse.json({ message: 'Hola desde el servidor!' });
}
