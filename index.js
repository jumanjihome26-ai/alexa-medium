import express from "express";
import OpenAI from "openai";

const app = express();
//🔧mover esto ARRIBA (antes de cualquier app.post)//
app.use(express.json());
app.use(express.static("public"));


//para traer los datos de frases.json (FRASE_DIARIA)
//no funcionó, dio error estás usando ES Modules (import)👉 NO CommonJS const datos = require("./frases.json");
//tampoco funcionó : import datos from "./frases.json" assert { type: "json" };

//Es un módulo nativo de Node.js. leer archivos, escribir archivos y  manejar el sistema de ficheros
import fs from "fs";

//lee archivo, lo convierte y lo deja listo para usar
const datos = JSON.parse(
  fs.readFileSync("./frases.json", "utf-8")
);

// 🎙️ MOTOR ALEXA (Formato obligatorio para que el dispositivo responda)
function respuestaAlexa(texto) {

  const reprompts = [
//FRASES QUE DIRÁ CUANDO PERMANECE A LA ESPERA:
    "El tablero sigue abierto… no te hagas la distraída.",
    "Sigo aquí… no finjas que no sabes qué toca.",
    "El tablero no se ha cerrado… por si estabas pensando escapar.",
    "Sigo escuchando… a ver qué haces ahora.",
    "Tranquila… no he desaparecido. Continúa.",
    "El tablero espera… sin prisa, pero sin pausa.",
    "Aquí sigo… no te me pierdas ahora.",
    "La jugada sigue en marcha… mueve ficha.",
    "No he cerrado… curioso, ¿no?"
  ];

  const repromptAleatorio = reprompts[Math.floor(Math.random() * reprompts.length)];

  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${texto}</speak>`
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
//COMANDOS TABLERO: BLOQUEO, TENSIÓN, ETC (Ahorro OpenAI)****************************************************
//Se activan al decirle "tablero: bloqueo, tensión,interferencia, reubicación, cierre  
    const comandosTablero = {
      "bloqueo": {
       /* VARIAS PRUEBAS REALIZADAS POR SEGUNDA VEZ PARA INCLUIR LA CANCION ESPECIFICA PERO NO FUNCIOAN:
       mensaje:`<audio src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"/> Muévete.`,
         //tampoco funcionó // mensaje: `<audio src="https://www.soundjay.com/buttons/sounds/button-16.mp3"/> Muévete.`,
         mensaje: `<audio src="https://alexa-medium.onrender.com/audio/1.mp3"/> Muévete.`,*/
        mensaje: "Muévete.",
          acciones: [
            "Levántate ahora.",
            "Da tres pasos hacia adelante.",
            "Gira sobre ti misma."
          ]
      }, //fin bloqueo
        
      "tension": {
          mensaje: "Aquí no.",
          acciones: [
            "Dale 2 puñetazos al saco boxeo.",
            "Respira Profundo."
          ]
      }, //fub tension

    "interferencia": {
          mensaje: "No afectan.",
          acciones: [
            "Ponte los auriculares.",
            "Sube el volumen de la música.",
            "Sal y da una vuelta a la manzana."
          ]
      }, //fin interferencia (vecinos chungos)
  
      "ancla": {
          mensaje: "Toca una superficie.",
          acciones: [
            "Apoya la mano en la mesa del comedor.",
            "Toca la pared que da a la plaza.",
            "Siente algo sólido."
          ]
      }, //fin ancla

      "cambio foco": {
          mensaje: "Toca una superficie.",
          acciones: [
            "Apoya la mano en la mesa del comedor.",
            "Toca la pared que da a la plaza.",
            "Siente algo sólido."
          ]
      }, //fin cambio foco
    
      "reubicar": {
          mensaje: "Cambia de zona.",
          acciones: [
            "Ve al baño.",
            "Baja a la entrada.",
            "Sal al patio.",
            "Sube a la azotea."
          ]
      }, //fin reubicar

      "cierre": {
          mensaje: "Ya está. Sigo.",
          acciones: [
            "Continúa con lo que hacías.",
            "Retoma la actividad.",
            "Sigue sin pensar."
          ]
        }//fin cierre (CUANDO TERMINA LA SITUACIÓN)
      };
     
// 3️⃣ DETECTORES (Booleanos)
     // 🧠 LÓGICA DE SALUDO (Frase diaria)
     // Se activan al decir tablero : hola y buenos días (Ej.: tablero hola y tablero buenos días)
    const esApertura = texto.includes("hola") || texto.includes("buenos dias");
    // 🎴 MENSAJES NECESITO UNA SEÑAL
    // Se activan al decir tablero : señal, orden, ayuda o peligro (Ej.: tablero necesito una señal)
    const esSeñal = texto.includes("senal") || texto.includes("orden")
                 || texto.includes("ayuda") || texto.includes("peligro");
    // 🔍 BUSCADOR DE COMANDO 
    //Se activan al deir tablero: bloqueo, tensión, reubicar, etc... (Ej.:tablero bloqueo)
    const comandoDetectado = Object.keys(comandosTablero).find(cmd => texto.includes(cmd));
    
// 4️⃣ EJECUCIÓN PRIORIDAD 1: COMANDOS (Ahorro OpenAI)
    if (comandoDetectado) {
      const data = comandosTablero[comandoDetectado];
      const accion = data.acciones[Math.floor(Math.random() * data.acciones.length)];
      // En el GET del navegador devolvemos JSON simple para leerlo bien
      return res.json(respuestaAlexa(`${data.mensaje} ${accion}`));
    }

// 5️⃣ EJECUCIÓN PRIORIDAD 2: SEÑAL (Ahorro OpenAI)   
  if (esSeñal) {
    const MENSAJES_SENAL = [
    "Reduce todo a una acción mínima.",
    "No elijas. Haz lo primero que veas.",
    "Detente. Respira. Luego actúa.",
    "Una sola acción. Nada más.",
    "No mejores. Termina."

    ];
     const mensaje = MENSAJES_SENAL[Math.floor(Math.random() * MENSAJES_SENAL.length)];
    //  ERROR: ESTE RETURN ESTÁ SUELTO return res.json(respuestaAlexa(mensaje)); // 🛑 AQUÍ CORTA Y AHORRA
    return res.json(respuestaAlexa(mensaje));
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
        //  ERROR: ESTE RETURN ESTÁ SUELTOreturn res.json(respuestaAlexa(frase)); // 🛑 AQUÍ CORTA Y AHORRA
    
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
          content: "Eres el Guardián de las Sendas. Hablas con tono de explorador, en tono sabio y cercano, con un toque misterioso y ligera narrativa  tipo Jumanji pero sin teatralidad ni frases épicas exageradas. Responde en 2 frases cortas, claras y naturales para voz. Evita lenguaje excesivamente literario o recargado, evita sonar como un chatbot. Siempre dejas una sensación de dirección o pequeño impulso a la acción."
         //content: PROBAR CON AÑADIDO Y SI NO ME GUSTA QUITARLO: . Siempre dejas una sensación de dirección o pequeño impulso a la acción.
       //OTRA PRUEBA PARA PERSONALIDAD DEL GUARDIÁN: tono de explorador, cercano y natural, con ligera narrativa tipo Jumanji pero sin teatralidad ni frases épicas exageradas
        },
        {
          role: "user",
          content: input
        }
      ]
    });

    const respuesta = completion.choices[0].message.content.trim();
    return res.json(respuestaAlexa(respuesta));

  } catch (error) {
    console.error(error);
    return res.json(respuestaAlexa("El Guardián ha tenido un fallo interno..."));
  }
});

// 🧪 TEST VISUAL (Navegador)
app.get("/webhook", async (req, res) => {
  try {
   if (req.query.key !== process.env.SECRET_KEY) {
    return res.status(403).send("No autorizado");
  }

  return res.json({ response: "El Guardián escucha..." });
       
  } catch (error) {
    return res.json({ response: "El Guardián ha tenido un fallo interno" });
  }
});

//PUERTO DONDE ESTÁ ACTIVO EL SERVIDOR
//original: const PORT = process.env.PORT || 3000;
const PORT = Number(process.env.PORT) || 3000; // NUMBER (...) Convierte lo que venga en process.env.PORT a número.
app.listen(PORT, () => {
  console.log("Servidor activo en puerto " + PORT);
});
