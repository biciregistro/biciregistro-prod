export const cities: Record<string, Record<string, string[]>> = {
  "México": {
    "Aguascalientes": ["Aguascalientes", "Asientos", "Calvillo", "Cosío", "Jesús María", "Pabellón de Arteaga", "Rincón de Romos", "San José de Gracia", "Tepezalá", "El Llano", "San Francisco de los Romo"],
    "Baja California": ["Ensenada", "Mexicali", "Tecate", "Tijuana", "Playas de Rosarito", "San Quintín", "San Felipe"],
    "Baja California Sur": ["Comondú", "Mulegé", "La Paz", "Los Cabos", "Loreto"],
    "Campeche": ["Calkiní", "Campeche", "Carmen", "Champotón", "Hecelchakán", "Hopelchén", "Palizada", "Tenabo", "Escárcega", "Calakmul", "Candelaria", "Seybaplaya", "Dzitbalché"],
    "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña", "Matamoros", "San Pedro", "Ramos Arizpe", "Frontera", "Múzquiz", "Sabinas"],
    "Colima": ["Armería", "Colima", "Comala", "Coquimatlán", "Cuauhtémoc", "Ixtlahuacán", "Manzanillo", "Minatitlán", "Tecomán", "Villa de Álvarez"],
    "Chiapas": ["Tuxtla Gutiérrez", "Tapachula", "San Cristóbal de las Casas", "Comitán de Domínguez", "Palenque", "Chiapa de Corzo", "Ocosingo", "Tonalá", "Villaflores"],
    "Chihuahua": ["Chihuahua", "Juárez", "Cuauhtémoc", "Delicias", "Parral", "Nuevo Casas Grandes", "Camargo", "Jiménez", "Ojinaga", "Meoqui"],
    "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa de Morelos", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "La Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"],
    "Durango": ["Durango", "Gómez Palacio", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro", "Guadalupe Victoria", "Cuencamé", "Canatlán", "Vicente Guerrero", "Tamazula"],
    "Guanajuato": ["León", "Irapuato", "Celaya", "Salamanca", "Silao", "Guanajuato", "San Miguel de Allende", "Dolores Hidalgo", "Valle de Santiago", "Pénjamo"],
    "Guerrero": ["Acapulco de Juárez", "Chilpancingo de los Bravo", "Iguala de la Independencia", "Zihuatanejo de Azueta", "Taxco de Alarcón", "Tlapa de Comonfort", "Chilapa de Álvarez", "Coyuca de Benítez", "Ometepec", "Tecpan de Galeana"],
    "Hidalgo": ["Pachuca de Soto", "Mineral de la Reforma", "Tulancingo de Bravo", "Tula de Allende", "Tepeji del Río de Ocampo", "Ixmiquilpan", "Huejutla de Reyes", "Actopan", "Cuautepec de Hinojosa", "Tepeapulco"],
    "Jalisco": ["Guadalajara", "Zapopan", "San Pedro Tlaquepaque", "Tonalá", "Tlajomulco de Zúñiga", "Puerto Vallarta", "Lagos de Moreno", "Tepatitlán de Morelos", "Zapotlán el Grande", "Ocotlán"],
    "México": ["Ecatepec de Morelos", "Nezahualcóyotl", "Toluca", "Naucalpan de Juárez", "Chimalhuacán", "Tlalnepantla de Baz", "Cuautitlán Izcalli", "Tecámac", "Ixtapaluca", "Atizapán de Zaragoza"],
    "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas", "Zitácuaro", "Apatzingán", "La Piedad", "Sahuayo", "Pátzcuaro", "Hidalgo"],
    "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco", "Yautepec", "Emiliano Zapata", "Xochitepec", "Puente de Ixtla", "Yecapixtla", "Tlayacapan"],
    "Nayarit": ["Tepic", "Bahía de Banderas", "Santiago Ixcuintla", "Compostela", "Xalisco", "San Blas", "Tecuala", "Rosamorada", "Ixtlán del Río", "Acaponeta"],
    "Nuevo León": ["Monterrey", "Guadalupe", "Apodaca", "San Nicolás de los Garza", "General Escobedo", "Santa Catarina", "Juárez", "García", "San Pedro Garza García", "Cadereyta Jiménez"],
    "Oaxaca": ["Oaxaca de Juárez", "San Juan Bautista Tuxtepec", "Juchitán de Zaragoza", "Santa Cruz Xoxocotlán", "Salina Cruz", "Heroica Ciudad de Huajuapan de León", "Santo Domingo Tehuantepec", "San Pedro Mixtepec", "Santa Lucía del Camino", "Santiago Pinotepa Nacional"],
    "Puebla": ["Puebla", "Tehuacán", "San Martín Texmelucan", "San Andrés Cholula", "Atlixco", "San Pedro Cholula", "Cuautlancingo", "Amozoc", "Huauchinango", "Teziutlán"],
    "Querétaro": ["Querétaro", "San Juan del Río", "El Marqués", "Corregidora", "Pedro Escobedo", "Tequisquiapan", "Colón", "Cadereyta de Montes", "Jalpan de Serra", "Ezequiel Montes"],
    "Quintana Roo": ["Benito Juárez", "Solidaridad", "Othón P. Blanco", "Cozumel", "Tulum", "Felipe Carrillo Puerto", "Isla Mujeres", "José María Morelos", "Bacalar", "Lázaro Cárdenas", "Puerto Morelos"],
    "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles", "Matehuala", "Rioverde", "Tamazunchale", "Mexquitic de Carmona", "Xilitla", "Villa de Reyes", "Aquismón"],
    "Sinaloa": ["Culiacán", "Mazatlán", "Ahome", "Guasave", "Navolato", "Salvador Alvarado", "El Fuerte", "Escuinapa", "Sinaloa", "Rosario"],
    "Sonora": ["Hermosillo", "Cajeme", "Nogales", "San Luis Río Colorado", "Navojoa", "Guaymas", "Caborca", "Agua Prieta", "Puerto Peñasco", "Etchojoa"],
    "Tabasco": ["Centro", "Cárdenas", "Comalcalco", "Huimanguillo", "Macuspana", "Cunduacán", "Jalpa de Méndez", "Nacajuca", "Paraíso", "Centla"],
    "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Victoria", "Tampico", "Ciudad Madero", "Altamira", "El Mante", "Río Bravo", "Valle Hermoso"],
    "Tlaxcala": ["Tlaxcala", "Apizaco", "Chiautempan", "Huamantla", "San Pablo del Monte", "Yauhquemehcan", "Contla de Juan Cuamatzi", "Papalotla de Xicohténcatl", "Tetla de la Solidaridad", "Calpulalpan"],
    "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica de Hidalgo", "Papantla", "Minatitlán", "San Andrés Tuxtla", "Tuxpan", "Boca del Río"],
    "Yucatán": ["Mérida", "Kanasín", "Valladolid", "Tizimín", "Umán", "Progreso", "Tekax", "Motul", "Ticul", "Chemax"],
    "Zacatecas": ["Zacatecas", "Guadalupe", "Fresnillo", "Jerez", "Río Grande", "Sombrerete", "Pinos", "Loreto", "Calera", "Ojocaliente"]
  }
};

export function getCities(countryName: string, stateName: string): string[] {
    if (cities[countryName] && cities[countryName][stateName]) {
        return cities[countryName][stateName].sort();
    }
    return [];
}
