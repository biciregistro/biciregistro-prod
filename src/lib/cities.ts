export const cities: Record<string, Record<string, string[]>> = {
  "México": {
    "Aguascalientes": [
      "Aguascalientes", "Asientos", "Calvillo", "Cosío", "El Llano", "Jesús María", 
      "Pabellón de Arteaga", "Rincón de Romos", "San Francisco de los Romo", "San José de Gracia", "Tepezalá"
    ],
    "Baja California": ["Ensenada", "Mexicali", "Playas de Rosarito", "San Felipe", "San Quintín", "Tecate", "Tijuana"],
    "Baja California Sur": ["Comondú", "La Paz", "Loreto", "Los Cabos", "Mulegé"],
    "Campeche": ["Calakmul", "Calkiní", "Campeche", "Candelaria", "Carmen", "Champotón", "Dzitbalché", "Escárcega", "Hecelchakán", "Hopelchén", "Palizada", "Seybaplaya", "Tenabo"],
    "Coahuila": ["Acuña", "Frontera", "Matamoros", "Monclova", "Múzquiz", "Piedras Negras", "Ramos Arizpe", "Sabinas", "Saltillo", "San Pedro", "Torreón"],
    "Colima": ["Armería", "Colima", "Comala", "Coquimatlán", "Cuauhtémoc", "Ixtlahuacán", "Manzanillo", "Minatitlán", "Tecomán", "Villa de Álvarez"],
    "Chiapas": ["Chiapa de Corzo", "Comitán de Domínguez", "Ocosingo", "Palenque", "San Cristóbal de las Casas", "Tapachula", "Tonalá", "Tuxtla Gutiérrez", "Villaflores"],
    "Chihuahua": ["Camargo", "Chihuahua", "Cuauhtémoc", "Delicias", "Jiménez", "Juárez", "Meoqui", "Nuevo Casas Grandes", "Ojinaga", "Parral"],
    "Ciudad de México": [
      "Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa de Morelos", 
      "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "La Magdalena Contreras", 
      "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"
    ],
    "Durango": ["Canatlán", "Cuencamé", "Durango", "Gómez Palacio", "Guadalupe Victoria", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro", "Tamazula", "Vicente Guerrero"],
    "Guanajuato": ["Celaya", "Dolores Hidalgo", "Guanajuato", "Irapuato", "León", "Pénjamo", "Salamanca", "San Miguel de Allende", "Silao", "Valle de Santiago"],
    "Guerrero": ["Acapulco de Juárez", "Chilapa de Álvarez", "Chilpancingo de los Bravo", "Coyuca de Benítez", "Iguala de la Independencia", "Ometepec", "Taxco de Alarcón", "Tecpan de Galeana", "Tlapa de Comonfort", "Zihuatanejo de Azueta"],
    "Hidalgo": ["Actopan", "Cuautepec de Hinojosa", "Huejutla de Reyes", "Ixmiquilpan", "Mineral de la Reforma", "Pachuca de Soto", "Tepeapulco", "Tepeji del Río de Ocampo", "Tula de Allende", "Tulancingo de Bravo"],
    "Jalisco": [
      "Acatic", "Acatlán de Juárez", "Ahualulco de Mercado", "Amacueca", "Amatitán", "Ameca", "Arandas", "Arenal", "Atemajac de Brizuela",
      "Atengo", "Atenguillo", "Atotonilco el Alto", "Atoyac", "Autlán de Navarro", "Ayotlán", "Ayutla", "Cabo Corrientes", "Casimiro Castillo",
      "Chapala", "Chimaltitán", "Chiquilistlán", "Cihuatlán", "Cocula", "Colotlán", "Concepción de Buenos Aires", "Cuautitlán de García Barragán",
      "Cuautla", "Cuquío", "Degollado", "Ejutla", "El Arenal", "El Grullo", "El Limón", "El Salto", "Encarnación de Díaz", "Etzatlán", "Gómez Farías",
      "Guadalajara", "Guachinango", "Hostotipaquillo", "Huejúcar", "Huejuquilla el Alto", "Ixtlahuacán de los Membrillos", "Ixtlahuacán del Río",
      "Jalostotitlán", "Jamay", "Jesús María", "Jilotlán de los Dolores", "Jocotepec", "Juanacatlán", "Juchitlán", "Lagos de Moreno", "La Barca",
      "La Huerta", "La Manzanilla de la Paz", "La Resolución", "La Yesca", "Magdalena", "Mascota", "Mazamitla", "Mexticacán", "Mezquitic",
      "Mixtlán", "Ocotlán", "Ojuelos de Jalisco", "Pihuamo", "Poncitlán", "Puerto Vallarta", "Quitupan", "San Cristóbal de la Barranca",
      "San Diego de Alejandría", "San Ignacio Cerro Gordo", "San Juan de los Lagos", "San Juanito de Escobedo", "San Julián", "San Marcos",
      "San Martín de Bolaños", "San Martín Hidalgo", "San Miguel el Alto", "San Pedro Tlaquepaque", "San Sebastián del Oeste", "Santa María de los Ángeles",
      "Santa María del Oro", "Sayula", "Tala", "Talpa de Allende", "Tamazula de Gordiano", "Tapalpa", "Tecalitlán", "Techaluta de Montenegro",
      "Tecolotlán", "Tenamaxtlán", "Teocaltiche", "Teocuitatlán de Corona", "Tepatitlán de Morelos", "Tequila", "Teuchitlán", "Tizapán el Alto",
      "Tlajomulco de Zúñiga", "Tlaquepaque", "Tolimán", "Tomatlán", "Tonalá", "Tonaya", "Tonila", "Totatiche", "Tototlán", "Tuxcacuesco", "Tuxcueca",
      "Tuxpan", "Unión de San Antonio", "Unión de Tula", "Valle de Guadalupe", "Valle de Juárez", "Villa Corona", "Villa Guerrero", "Villa Hidalgo",
      "Villa Purificación", "Yahualica de González Gallo", "Zacoalco de Torres", "Zapopan", "Zapotiltic", "Zapotitlán de Vadillo", "Zapotlán del Rey",
      "Zapotlán el Grande", "Zapotlanejo"
    ],
    "México": [
      "Acambay de Ruíz Castañeda", "Acolman", "Aculco", "Almoloya de Alquisiras", "Almoloya de Juárez", "Almoloya del Río", "Amanalco", 
      "Amatepec", "Amecameca", "Apaxco", "Atenco", "Atizapán", "Atizapán de Zaragoza", "Atlacomulco", "Atlautla", "Axapusco", "Ayapango", 
      "Calimaya", "Capulhuac", "Coacalco de Berriozábal", "Coatepec Harinas", "Cocotitlán", "Coyotepec", "Cuautitlán", "Cuautitlán Izcalli", 
      "Chalco", "Chapa de Mota", "Chapultepec", "Chiautla", "Chicoloapan", "Chiconcuac", "Chimalhuacán", "Donato Guerra", "Ecatepec de Morelos", 
      "Ecatzingo", "Huehuetoca", "Hueypoxtla", "Huixquilucan", "Isidro Fabela", "Ixtapaluca", "Ixtapan de la Sal", "Ixtapan del Oro", "Ixtlahuaca", 
      "Xalatlaco", "Jaltenco", "Jilotepec", "Jilotzingo", "Jiquipilco", "Jocotitlán", "Joquicingo", "Juchitepec", "Lerma", "Malinalco", "Melchor Ocampo", 
      "Metepec", "Mexicaltzingo", "Morelos", "Naucalpan de Juárez", "Nezahualcóyotl", "Nextlalpan", "Nicolás Romero", "Nopaltepec", "Ocoyoacac", 
      "Ocuilan", "El Oro", "Otumba", "Otzoloapan", "Otzolotepec", "Ozumba", "Papalotla", "La Paz", "Polotitlán", "Rayón", "San Antonio la Isla", 
      "San Felipe del Progreso", "San Martín de las Pirámides", "San Mateo Atenco", "San Simón de Guerrero", "Santo Tomás", "Soyaniquilpan de Juárez", 
      "Sultepec", "Tecámac", "Tejupilco", "Temamatla", "Temascalapa", "Temascalcingo", "Temascaltepec", "Temoaya", "Tenancingo", "Tenango del Aire", 
      "Tenango del Valle", "Teoloyucan", "Teotihuacán", "Tepetlaoxtoc", "Tepetlixpa", "Tepotzotlán", "Tequixquiac", "Texcaltitlán", "Texcalyacac", 
      "Texcoco", "Tezoyuca", "Tianguistenco", "Timilpan", "Tlalmanalco", "Tlalnepantla de Baz", "Tlatlaya", "Toluca", "Tonatico", "Tultepec", 
      "Tultitlán", "Valle de Bravo", "Valle de Chalco Solidaridad", "Villa de Allende", "Villa del Carbón", "Villa Guerrero", "Villa Victoria", 
      "Xonacatlán", "Zacazonapan", "Zacualpan", "Zinacantepec", "Zumpahuacán", "Zumpango", "San José del Rincón", "Tonanitla", "Luvianos"
    ],
    "Michoacán": ["Apatzingán", "Hidalgo", "La Piedad", "Lázaro Cárdenas", "Morelia", "Pátzcuaro", "Sahuayo", "Uruapan", "Zamora", "Zitácuaro"],
    "Morelos": ["Cuautla", "Cuernavaca", "Emiliano Zapata", "Jiutepec", "Puente de Ixtla", "Temixco", "Tlayacapan", "Xochitepec", "Yautepec", "Yecapixtla"],
    "Nayarit": ["Acaponeta", "Bahía de Banderas", "Compostela", "Ixtlán del Río", "Rosamorada", "San Blas", "Santiago Ixcuintla", "Tecuala", "Tepic", "Xalisco"],
    "Nuevo León": [
      "Abasolo", "Agualeguas", "Los Aldamas", "Allende", "Anáhuac", "Apodaca", "Aramberri", "Bustamante", "Cadereyta Jiménez", "El Carmen",
      "Cerralvo", "Ciénega de Flores", "China", "Doctor Arroyo", "Doctor Coss", "Doctor González", "Galeana", "García", "San Pedro Garza García",
      "General Bravo", "General Escobedo", "General Terán", "General Treviño", "General Zaragoza", "General Zuazua", "Guadalupe", "Los Herreras",
      "Higueras", "Hualahuises", "Iturbide", "Juárez", "Lampazos de Naranjo", "Linares", "Marín", "Melchor Ocampo", "Mier y Noriega", "Mina",
      "Montemorelos", "Monterrey", "Parás", "Pesquería", "Los Ramones", "Rayones", "Sabinas Hidalgo", "Salinas Victoria", "San Nicolás de los Garza",
      "Hidalgo", "Santa Catarina", "Santiago", "Vallecillo", "Villaldama"
    ],
    "Oaxaca": ["Heroica Ciudad de Huajuapan de León", "Juchitán de Zaragoza", "Oaxaca de Juárez", "Salina Cruz", "San Juan Bautista Tuxtepec", "San Pedro Mixtepec", "Santa Cruz Xoxocotlán", "Santa Lucía del Camino", "Santiago Pinotepa Nacional", "Santo Domingo Tehuantepec"],
    "Puebla": ["Amozoc", "Atlixco", "Cuautlancingo", "Huauchinango", "Puebla", "San Andrés Cholula", "San Martín Texmelucan", "San Pedro Cholula", "Tehuacán", "Teziutlán"],
    "Querétaro": [
        "Amealco de Bonfil", "Arroyo Seco", "Cadereyta de Montes", "Colón", "Corregidora", 
        "El Marqués", "Ezequiel Montes", "Huimilpan", "Jalpan de Serra", "Landa de Matamoros", 
        "Pedro Escobedo", "Peñamiller", "Pinal de Amoles", "Querétaro", "San Joaquín", 
        "San Juan del Río", "Tequisquiapan", "Tolimán"
    ],
    "Quintana Roo": ["Bacalar", "Benito Juárez", "Cozumel", "Felipe Carrillo Puerto", "Isla Mujeres", "José María Morelos", "Lázaro Cárdenas", "Othón P. Blanco", "Puerto Morelos", "Solidaridad", "Tulum"],
    "San Luis Potosí": ["Aquismón", "Ciudad Valles", "Matehuala", "Mexquitic de Carmona", "Rioverde", "San Luis Potosí", "Soledad de Graciano Sánchez", "Tamazunchale", "Villa de Reyes", "Xilitla"],
    "Sinaloa": ["Ahome", "Culiacán", "El Fuerte", "Escuinapa", "Guasave", "Mazatlán", "Navolato", "Rosario", "Salvador Alvarado", "Sinaloa"],
    "Sonora": ["Agua Prieta", "Caborca", "Cajeme", "Etchojoa", "Guaymas", "Hermosillo", "Navojoa", "Nogales", "Puerto Peñasco", "San Luis Río Colorado"],
    "Tabasco": ["Cárdenas", "Centla", "Centro", "Comalcalco", "Cunduacán", "Huimanguillo", "Jalpa de Méndez", "Macuspana", "Nacajuca", "Paraíso"],
    "Tamaulipas": ["Altamira", "Ciudad Madero", "El Mante", "Matamoros", "Nuevo Laredo", "Reynosa", "Río Bravo", "Tampico", "Valle Hermoso", "Victoria"],
    "Tlaxcala": ["Apizaco", "Calpulalpan", "Contla de Juan Cuamatzi", "Chiautempan", "Huamantla", "Papalotla de Xicohténcatl", "San Pablo del Monte", "Tetla de la Solidaridad", "Tlaxcala", "Yauhquemehcan"],
    "Veracruz": ["Boca del Río", "Coatzacoalcos", "Córdoba", "Minatitlán", "Papantla", "Poza Rica de Hidalgo", "San Andrés Tuxtla", "Tuxpan", "Veracruz", "Xalapa"],
    "Yucatán": ["Chemax", "Kanasín", "Mérida", "Motul", "Progreso", "Tekax", "Ticul", "Tizimín", "Umán", "Valladolid"],
    "Zacatecas": ["Calera", "Fresnillo", "Guadalupe", "Jerez", "Loreto", "Ojocaliente", "Pinos", "Río Grande", "Sombrerete", "Zacatecas"]
  }
};

export function getCities(countryName: string, stateName: string): string[] {
    if (cities[countryName] && cities[countryName][stateName]) {
        // Aseguramos que la lista sea de valores únicos usando un Set
        const uniqueCities = Array.from(new Set(cities[countryName][stateName]));
        return uniqueCities.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }
    return [];
}
