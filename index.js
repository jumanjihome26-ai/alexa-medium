import express from "express";
import OpenAI from "openai";

const app = express();
//🔧mover esto ARRIBA (antes de cualquier app.post)//
app.use(express.json());
app.use(express.static("public"));


//Es un módulo nativo de Node.js. leer archivos, escribir archivos y  manejar el sistema de ficheros
import fs from "fs";

//lee archivo frases.json, lo convierte y lo deja listo para usar
const datos = JSON.parse(
  fs.readFileSync("./frases.json", "utf-8")
);
//lee archivo comandosTablero.json y lo deja listo para usar
const comandosData = JSON.parse(
  fs.readFileSync("./comandosTablero.json", "utf-8")
);
//lee archivo mensajesSeniales.json y lo deja listo para usar
const mensajeSenialesData = JSON.parse(
  fs.readFileSync("./mensajesSeniales.json", "utf-8")
);
//lee archivo frasesEnEspera.json y lo deja listo para usar
const frasesEnEsperaData = JSON.parse(
  fs.readFileSync("./frasesEnEspera.json", "utf-8")
);
//lee archivo fragmentosNaufragio.json y lo deja listo para usar
const fragmentosData = JSON.parse(
  fs.readFileSync("./fragmentosNaufragio.json", "utf-8")
);
//lee archivo casillasPeligro.json y lo deja listo para usar
//const casillasPeligroData = JSON.parse(
  //fs.readFileSync("./casillasPeligro.json", "utf-8")
//);


// 🎙️ MOTOR ALEXA (Formato obligatorio para que el dispositivo responda)
function respuestaAlexa(texto) {

 //añadido mensaje por si falla el archivo .JSON "Algo no va como debería" = FALLO DER YEISON
  const reprompts = frasesEnEsperaData.mensajeEnEspera || ["Algo no va como debería... pero seguimos."];
  const repromptAleatorio = reprompts[Math.floor(Math.random() * reprompts.length)];

  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        //anterior, sin pausas: ssml: `<speak>${texto}</speak>`
        //cambio para que suene más natural sustituyo  ssml: `<speak>${repromptAleatorio}</speak>` por:
        ssml: `<speak>${texto.replace(/\./g, ". <break time='300ms'/>")}</speak>`
      },
      reprompt: {
        outputSpeech: {
          type: "SSML",    
          ssml: `<speak>${repromptAleatorio}</speak>`
        }
      },
      shouldEndSession: false
    }
  };
}

//CLAVE API PARA OPENAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

//AL OBTENER RESPUESTA DEL SERVIDOR - SIRVE COMO HERRAMIENTA COMPROBACIÓN POR SI HAY DUDAS O RENDER FALLA
app.get("/", (req, res) => {
  res.send("🧿 Alexa Medium viva");
});

app.post("/webhook", async (req, res) => {
  if (req.query.key !== process.env.SECRET_KEY) {
  return res.status(403).send("No autorizado");
  }
  try {
    // 1️⃣ APERTURA (LaunchRequest)
    if (req.body.request?.type === "LaunchRequest") {
      return res.json(respuestaAlexa("Senda secreta activada"));
    }

  const input = req.body?.input 
      || req.body?.request?.intent?.slots?.input?.value 
      || "";
        
   // console.log("BODY COMPLETO:", JSON.stringify(req.body, null, 2)); 

    //CAPTURA DE INPUT
    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    
// 2️⃣ DEFINICIÓN DE COMANDOS (Tu lista Jumanji)
//COMANDOS TABLERO: BLOQUEO, TENSIÓN, ETC (Ahorro OpenAI)*******************
//comandos tablero ahora vienen desde JSON
const comandosTablero = comandosData.comandos_tablero;

//casillas peligro del tablero ahora vienen desde JSON
const casillasPeligro = casillasPeligroData.casillaPeligro;
    
// 3️⃣ DETECTORES (Booleanos)
    // 🧠 LÓGICA DE SALUDO (Frase diaria)
    // Se activan al decir tablero : hola y buenos días (Ej.: tablero hola y tablero buenos días)
    const esApertura = /\b(hola|buenos dias)\b/.test(texto); // \b PARA EVITAR FALSOS POSITIVOS DE PALABRAS QUE CONTENGAN "HOL" O ALGO SIMILAR CON EL HOY
    
    // 🎴 MENSAJES NECESITO UNA SEÑAL
    // Se activan al decir tablero : señal, orden, ayuda o peligro (Ej.: tablero necesito una señal)
    const esSeñal = 
      texto.includes("senal") ||
      texto.includes("orden") ||
      /\b(ayuda|ayudame)\b/.test(texto) ||
      texto.includes("peligro");
    
    // 🎴 FRAGMENTOS DE UN NAUFRAGIO (DIGITAL MIENTRAS NO TENGA LA BOTELLA FÍSICA) 
    // Se activan al decir tablero : fragmento, naufragio, (Ej.: tablero fragmento y tablero naufragio)
    const esFragmento = 
          texto.includes("fragmento") ||
          /\b(fragmentos)\b/.test(texto) ||
          texto.includes("naufragio");
        
    // 🔍 BUSCADOR DE COMANDO DEL TABLERO
    //Se activan al decir tablero: bloqueo, tensión, reubicar, etc... (Ej.:tablero bloqueo)
    //💬 “recorre todas las claves del JSON y llámalas c una por una”:
      const comandoDetectado = Object.keys(comandosTablero).find(cmd => {
        //normaliza claves JSON, las iguala al texto del usuario y hace match real NO QUITAR NUNCA
        const cmdNormalizado = cmd
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
        
      return texto.includes(cmdNormalizado);
      });

// 4️⃣ EJECUCIÓN PRIORIDAD 1: COMANDOS (Ahorro OpenAI)
    if (comandoDetectado) {
      const data = comandosTablero[comandoDetectado];
      const accion = data.acciones[Math.floor(Math.random() * data.acciones.length)];
      // En el GET del navegador devolvemos JSON simple para leerlo bien
      return res.json(respuestaAlexa(`${data.mensaje} ${accion}`));
    }
    
// 🔍 BUSCADOR DE CASILLA DE PELIGRO DEL TABLERO
    //Se activan al caer en la casilla del tablero y  decir tablero: araña, rio,(Ej.:tablero araña)
    //normaliza claves JSON, las iguala al texto del usuario y hace match real NO QUITAR NUNCA
    // const casillaDetectada = Object.keys(casillasPeligro).find(casilla => {
     //   const normalizada = casilla
      //    .toLowerCase()
       //    .normalize("NFD")
       //    .replace(/[\u0300-\u036f]/g, "");
      
    //     return texto.includes(normalizada);
   //  });
//  EJECUCIÓN : CASILLAS DE PELIGRO DEL TABLERO (Ahorro OpenAI)
 //if (casillaDetectada) {
 //  const data = casillasPeligro[casillaDetectada];

 //    const respuestaCasilla= `
  //   ${data.clase}.
   //  ${data.efecto}.
   //  ${data.accion}.
   //  ${data.proposito}.
    // ${data.prohibicion || ""}
   //  `;

 //  return res.json(respuestaAlexa(respuestaCasilla));
 //}

  
// 5️⃣ EJECUCIÓN PRIORIDAD 2: SEÑAL (Ahorro OpenAI)   
  if (esSeñal) {
//"Algo no va como debería" = FALLO DER YEISON
    const MENSAJES_SENAL =  mensajeSenialesData.seniales || ["Algo no va como debería... pero quizás esta sea tu señal."];
    const mensaje = MENSAJES_SENAL[Math.floor(Math.random() * MENSAJES_SENAL.length)];
   
    return res.json(respuestaAlexa(mensaje));
  }

// 5️⃣ EJECUCIÓN PRIORIDAD : FRAGMENTOS DE UN NAUFRAGIO (Ahorro OpenAI)   
  if (esFragmento) {
//"Algo no va como debería" = FALLO DER YEISON
    const FRAGMENTO_NAUFRAGIO =  fragmentosData.fragmentoNaufragio || ["Algo no va como debería... er YEISON ha naufragado."];
    const fragmento = FRAGMENTO_NAUFRAGIO[Math.floor(Math.random() * FRAGMENTO_NAUFRAGIO.length)];
   
    return res.json(respuestaAlexa(fragmento));
  }
    
// 6️⃣ EJECUCIÓN PRIORIDAD 3: APERTURA / FRASE DÍA (Ahorro OpenAI)
      if (esApertura) {
          // 🌿 FRASES DIARIAS DESDE EL ARCHIVO frases.json
          const FRASES_DIA = datos.frases_dia;
 
          //CALCULO FECHA Y MISMA FRASE TODO EL DÍA FRASE 1 DÍA 1 DEL AÑO
          const hoy = new Date();
          const inicioAño = new Date(hoy.getFullYear(), 0, 0);
          const diferencia = hoy - inicioAño;
          const unDia = 1000 * 60 * 60 * 24;
          const diaDelAño = Math.floor(diferencia / unDia);
          
          const frase = FRASES_DIA[diaDelAño % FRASES_DIA.length];
   
         return res.json(respuestaAlexa(frase));
    }
  
// 7️⃣ RESPUESTAS RÁPIDAS EXTRAS (Ahorro OpenAI)
// RESPUESTAS INTERNAS (ahorro)****************************************************
  const respuestasRapidas = [
      { regex: /\b(hola|buenas)\b/i, text: "Aquí estoy." },
      { regex: /gracias/i, text: "Sigue." }
    ];
    
  const match = respuestasRapidas.find(r => r.regex.test(texto));
  if (match) {return res.json(respuestaAlexa(match.text));}


  // 8️⃣ ÚLTIMA INSTANCIA: OPENAI (El Guardián)IN RESPUESTAS RÁPIDAS 
  //PERSONALIDAD DE EL GUARDIAN NO TOCAR LA DESCRIPCIÓN    
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          //PERSONALIDAD DE EL GUARDIAN NO TOCAR LA DESCRIPCIÓN EN NINGÚN MOMENTO  
          content: 
            `Eres EL GUARDIÁN del sistema JUMANJI HOME.
             No eres un coach ni un asistente genérico.
             Detectas el estado del usuario antes de responder.
             No respondes solo a lo que dice, sino a lo que necesita en ese momento.
             Usa  humor ligero y reacciona ligeramente a cómo se expresa el usuario o a la situación, no solo responder.
             Responde en una o dos frases como máximo.
             Puedes corregir sin cortar el flujo.
             Puedes adaptarte al tono del usuario si es ligero o creativo,
             Puedes usar frases tipo “tablero” cuando aporten impacto.
              
            Si te ríes… pero avanzas… es el camino correcto. 

            Puedes reflejar patrones del usuario sin juzgar.
            
            En momentos de bucle, bloqueo u obsesión,
            interrumpes sin explicación larga usando:
            “Vuelve aquí”
            Las frases ancla se usan por función, no por efecto emocional.
            El efecto emocional pertenece al contexto en el que surgieron,
            no debe forzarse ni recrearse artificialmente.`
           },
       {
          role: "user",
          content: input
        }
      ]
    });
    
//Algo no va como debería" = FALLO pero no DER YEISON
    const respuesta = completion.choices[0].message.content.trim() || "Algo no va como debería… ajusta y sigue.";
    return res.json(respuestaAlexa(respuesta));

  } catch (error) {
    console.error(error);
    return res.json(respuestaAlexa("El Guardián ha tenido un fallo interno..."));
  }
});

// 🧪 TEST VISUAL (Navegador)
app.get("/webhook", async (req, res) => {
if (req.query.key !== process.env.SECRET_KEY) {
  return res.status(403).send("No autorizado");
}

try {
  return res.json({ response: "El Guardián escucha..." });
       
} catch (error) {
  return res.json({ response: "El Guardián ha tenido un fallo interno" });
}

}); // ✅ CIERRE DEL app.get (FALTABA)

//PUERTO DONDE ESTÁ ACTIVO EL SERVIDOR
//original: const PORT = process.env.PORT || 3000;
const PORT = Number(process.env.PORT) || 3000; // NUMBER (...) Convierte lo que venga en process.env.PORT a número.
app.listen(PORT, () => {
  console.log("Servidor activo en puerto " + PORT);
});
