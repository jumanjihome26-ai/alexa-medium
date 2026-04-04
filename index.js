import express from "express";
import OpenAI from "openai";

const app = express();
//🔧mover esto ARRIBA (antes de cualquier app.post)//
app.use(express.json());
app.use(express.static("public"));

// 🎙️ MOTOR ALEXA (Formato obligatorio para que el dispositivo responda)
function respuestaAlexa(texto) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${texto}</speak>`
      },
      shouldEndSession: false
    }
  };
}

//CLAVE API PARA OPENAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

//AL OBTENER RESPUESTA DEL SERVIDOR
app.get("/", (req, res) => {
  res.send("🧿 Alexa Medium viva");
});

app.post("/webhook", async (req, res) => {
  try {
    // 1️⃣ APERTURA (LaunchRequest)
    if (req.body.request?.type === "LaunchRequest") {
      return res.json(respuestaAlexa("Senda activada"));
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
          // 🌿 FRASES DIARIAS****************************************************
          const FRASES_DIA = [
          "El tablero no pregunta si quieres jugar. Ya estás dentro.",
          "No avanzar… también cuenta como casilla.",
          "Cada paso ordena más que mil intenciones.",
          "Hoy no limpias. Hoy conquistas territorio.",
          "El desorden no es enemigo… es mapa sin leer.",
          "Si dudas, lanza el dado. Si temes, avanza igual.",
          "No soy constante… soy persistente.",
          "No sigo rutina… sigo una senda.",
          "No limpio… restauro equilibrio.",
          "No cumplo tareas… respondo al tablero.",
          "No busco motivación… invoco movimiento.",
          "El tablero no castiga… revela.",
          "Cada objeto fuera de lugar… es una historia detenida.",
          "Donde hay caos… hay energía esperando dirección.",
          "El explorador no controla el juego… lo atraviesa.",
          "Hay días de avance… y días de escucha. Ambos cuentan."
 
    ];
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
          content: "Eres el Guardián de las Sendas. Hablas con tono misterioso, sabio y cercano, con ligera narrativa de explorador. Responde en 2 frases cortas, claro y natural para voz. Evita lenguaje excesivamente literario o recargado, evita sonar como un chatbot."
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
   // const input = req.query.input || "";
    //const texto = input ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    //  : "";
     
    // Aquí podrías añadir lógica simplificada de test si quieres, 
    // pero de momento lo dejamos limpio para evitar errores.
    return res.json({ response: "El Guardián escucha..." });
    
  } catch (error) {
    return res.json({ response: "El Guardián ha tenido un fallo interno" });
  }
});

//PUERTO DONDE ESTÁ ACTIVO EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto " + PORT);
});
