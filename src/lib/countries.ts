export type Country = {
    name: string;
    code: string;
    states: string[];
};

export const countries: Country[] = [
    {
        name: "México",
        code: "MX",
        states: [
            "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
            "Chihuahua", "Coahuila", "Colima", "Ciudad de México", "Durango", "Guanajuato",
            "Guerrero", "Hidalgo", "Jalisco", "México", "Michoacán", "Morelos", "Nayarit",
            "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
            "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
        ]
    },
    {
        name: "Argentina",
        code: "AR",
        states: [
            "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos",
            "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
            "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
            "Tierra del Fuego", "Tucumán"
        ]
    },
    {
        name: "Bolivia",
        code: "BO",
        states: ["Beni", "Chuquisaca", "Cochabamba", "La Paz", "Oruro", "Pando", "Potosí", "Santa Cruz", "Tarija"]
    },
    {
        name: "Brasil",
        code: "BR",
        states: [
            "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo",
            "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba",
            "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
            "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
        ]
    },
    {
        name: "Chile",
        code: "CL",
        states: [
            "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso",
            "Metropolitana de Santiago", "Libertador General Bernardo O'Higgins", "Maule", "Ñuble", "Biobío",
            "La Araucanía", "Los Ríos", "Los Lagos", "Aysén del General Carlos Ibáñez del Campo",
            "Magallanes y de la Antártica Chilena"
        ]
    },
    {
        name: "Colombia",
        code: "CO",
        states: [
            "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas", "Caquetá",
            "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare",
            "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo",
            "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima",
            "Valle del Cauca", "Vaupés", "Vichada"
        ]
    },
    {
        name: "Costa Rica",
        code: "CR",
        states: ["Alajuela", "Cartago", "Guanacaste", "Heredia", "Limón", "Puntarenas", "San José"]
    },
    {
        name: "Cuba",
        code: "CU",
        states: [
            "Artemisa", "Camagüey", "Ciego de Ávila", "Cienfuegos", "Granma", "Guantánamo", "Holguín",
            "Isla de la Juventud", "La Habana", "Las Tunas", "Matanzas", "Mayabeque", "Pinar del Río",
            "Sancti Spíritus", "Santiago de Cuba", "Villa Clara"
        ]
    },
    {
        name: "Ecuador",
        code: "EC",
        states: [
            "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas",
            "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona-Santiago",
            "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas",
            "Sucumbíos", "Tungurahua", "Zamora-Chinchipe"
        ]
    },
    {
        name: "El Salvador",
        code: "SV",
        states: [
            "Ahuachapán", "Cabañas", "Chalatenango", "Cuscatlán", "La Libertad", "La Paz", "La Unión",
            "Morazán", "San Miguel", "San Salvador", "San Vicente", "Santa Ana", "Sonsonate", "Usulután"
        ]
    },
    {
        name: "Guatemala",
        code: "GT",
        states: [
            "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla",
            "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango",
            "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá",
            "Suchitepéquez", "Totonicapán", "Zacapa"
        ]
    },
    {
        name: "Honduras",
        code: "HN",
        states: [
            "Atlántida", "Choluteca", "Colón", "Comayagua", "Copán", "Cortés", "El Paraíso",
            "Francisco Morazán", "Gracias a Dios", "Intibucá", "Islas de la Bahía", "La Paz", "Lempira",
            "Ocotepeque", "Olancho", "Santa Bárbara", "Valle", "Yoro"
        ]
    },
    {
        name: "Nicaragua",
        code: "NI",
        states: [
            "Boaco", "Carazo", "Chinandega", "Chontales", "Costa Caribe Norte", "Costa Caribe Sur",
            "Estelí", "Granada", "Jinotega", "León", "Madriz", "Managua", "Masaya", "Matagalpa",
            "Nueva Segovia", "Río San Juan", "Rivas"
        ]
    },
    {
        name: "Panamá",
        code: "PA",
        states: [
            "Bocas del Toro", "Chiriquí", "Coclé", "Colón", "Darién", "Herrera", "Los Santos",
            "Panamá", "Panamá Oeste", "Veraguas"
        ]
    },
    {
        name: "Paraguay",
        code: "PY",
        states: [
            "Alto Paraguay", "Alto Paraná", "Amambay", "Asunción", "Boquerón", "Caaguazú",
            "Caazapá", "Canindeyú", "Central", "Concepción", "Cordillera", "Guairá", "Itapúa",
            "Misiones", "Ñeembucú", "Paraguarí", "Presidente Hayes", "San Pedro"
        ]
    },
    {
        name: "Perú",
        code: "PE",
        states: [
            "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao",
            "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque",
            "Lima", "Loreto", "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno",
            "San Martín", "Tacna", "Tumbes", "Ucayali"
        ]
    },
    {
        name: "República Dominicana",
        code: "DO",
        states: [
            "Azua", "Bahoruco", "Barahona", "Dajabón", "Distrito Nacional", "Duarte", "El Seibo",
            "Elías Piña", "Espaillat", "Hato Mayor", "Hermanas Mirabal", "Independencia",
            "La Altagracia", "La Romana", "La Vega", "María Trinidad Sánchez", "Monseñor Nouel",
            "Monte Cristi", "Monte Plata", "Pedernales", "Peravia", "Puerto Plata", "Samaná",
            "San Cristóbal", "San José de Ocoa", "San Juan", "San Pedro de Macorís",
            "Sánchez Ramírez", "Santiago", "Santiago Rodríguez", "Valverde"
        ]
    },
    {
        name: "Uruguay",
        code: "UY",
        states: [
            "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida",
            "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha",
            "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"
        ]
    },
    {
        name: "Venezuela",
        code: "VE",
        states: [
            "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes",
            "Delta Amacuro", "Dependencias Federales", "Distrito Capital", "Falcón", "Guárico",
            "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa", "Sucre",
            "Táchira", "Trujillo", "Vargas", "Yaracuy", "Zulia"
        ]
    }
];
