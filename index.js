import express from "express";
import OpenAI from "openai";

const app = express();

// 🔧 FIX 1: mover esto ARRIBA (antes de cualquier app.post)
// 🔧 leer JSON (peticiones de Alexa)
app.use(express.json());

// 🔧 SERVIR ARCHIVOS ESTÁTICOS (audio)
// Permite acceder a /public/audio desde navegador o Alexa
app.use(express.static("public"));

// 🔧 FIX 2: función bien definida (ANTES estaba rota y contenía un webhook dentro)
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

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧿 TEST
app.get("/", (req, res) => {
  res.send("🧿 Alexa Medium viva");
});

// 🔥 WEBHOOK (ÚNICO - eliminado duplicado anterior)
app.post("/webhook", async (req, res) => {
  try {

    // 🔧 FIX 3: eliminar return de prueba que bloqueaba TODO
    // (antes devolvía "Conexión establecida" y nunca ejecutaba lógica)

    // 🔧 FIX: detectar LaunchRequest (cuando Alexa abre la skill)
    if (req.body.request?.type === "LaunchRequest") {
      return res.json(respuestaAlexa("El Guardián está despierto."));
    }
    //LINEA SUSTITUIDA POR LO DE ABAJO //const input = req.body?.input || "";

  // 🔧 ADAPTADOR ALEXA → PIPEDREAM
// Antes: solo leíamos req.body.input (formato Pipedream)
// Ahora: Alexa envía el texto dentro de request.intent.slots.input.value
// Este cambio NO modifica la lógica del sistema, solo permite leer correctamente el input venga de donde venga

  const input = req.body?.input 
    || req.body?.request?.intent?.slots?.input?.value 
    || "";
        
    // 🧪 DEBUG — VER QUÉ ENVÍA ALEXA
    console.log("BODY COMPLETO:", JSON.stringify(req.body, null, 2)); //AÑADIDO 
    
    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    // 🧠 APERTURA
    const esApertura = texto === "hola";

    // 🧠 SEÑAL
    const esSeñal = texto.includes("senal") 
              || texto.includes("orden")
              || texto.includes("ayuda")
              || texto.includes("peligro");

    // 🌿 FRASES DÍA
    const FRASES_DIA = [
      "El tablero no pregunta si quieres jugar. Ya estás dentro.",
      "No avanzar… también cuenta como casilla.",
      "Cada paso ordena más que mil intenciones.",
      "Hoy no limpias. Hoy conquistas territorio.",
      "El desorden no es enemigo… es mapa sin leer."
    ];

    const hoy = new Date();
    const inicioAño = new Date(hoy.getFullYear(), 0, 0);
    const diferencia = hoy - inicioAño;
    const unDia = 1000 * 60 * 60 * 24;
    const diaDelAño = Math.floor(diferencia / unDia);

    const frase = FRASES_DIA[diaDelAño % FRASES_DIA.length];

    // 🎴 MENSAJES SEÑAL
    const MENSAJES_SENAL = [
      "Reduce todo a una acción mínima.",
      "No elijas. Haz lo primero que veas.",
      "Una sola acción. Nada más."
    ];

    const mensaje = MENSAJES_SENAL[Math.floor(Math.random() * MENSAJES_SENAL.length)];

    // 🔧 FIX 4: TODAS las respuestas pasan por respuestaAlexa
    if (esSeñal) {
      return res.json(respuestaAlexa(mensaje));
    }

    if (esApertura) {
      return res.json(respuestaAlexa(frase));
    }

    
  // 🧿 COMANDOS TABLERO
    const comandosTablero = {
      "bloqueo": {
          mensaje: "Muévete.",
         acciones: [
            "Levántate ahora.",
            "Da tres pasos hacia adelante.",
            "Gira sobre ti misma."
          ], //DUDA CON ESTA COMA SI DA ERROR QUITARLA
      }
  };
    
   const comandoDetectado = Object.keys(comandosTablero).find(cmd =>
   texto.includes(cmd)
    );

  // 🧿 COMANDOS TABLERO (EJECUCIÓN)
  // Este bloque se activa cuando el texto contiene un comando como "bloqueo"
  if (comandoDetectado) {
  
    // 📦 Recuperamos los datos del comando detectado (mensaje, acciones, audio...)
      const data = comandosTablero[comandoDetectado];
    
      // 🎲 Seleccionamos una acción aleatoria del array
      // (esto mantiene tu lógica original de variabilidad)
      const accion = data.acciones[Math.floor(Math.random() * data.acciones.length)];
      return res.json(respuestaAlexa(`${data.mensaje} ${accion}`));
  //}
  });
}

// 🧠 RESPUESTAS RÁPIDAS
    const respuestasRapidas = [
      { regex: /\b(hola|buenas)\b/i, text: "Aquí estoy." },
      { regex: /gracias/i, text: "Sigue." }
    ];
    const match = respuestasRapidas.find(r => r.regex.test(texto));
    if (match) {
      return res.json(respuestaAlexa(match.text));
    }

// 🧠 OPENAI
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          //content: "Eres el Guardián de las Sendas. Hablas cercano, con ligera narrativa tipo explorador, sin exagerar."
           //MI GUARDIÁN - - - NO CAMBIAR NI TOCAR NADA ---
          content: "Eres el Guardián de las Sendas. Hablas con tono misterioso, 
                   sabio y cercano, con ligera narrativa de explorador. Responde en 2 frases, claro y natural para voz.
                   Evita lenguaje excesivamente literario o recargado , evita sonar como un cahtbot."
        },
        {
          role: "user",
          content: input
        }
      ]
    });

    const respuesta = completion.choices[0].message.content.trim();

    // 🔧 FIX 5: devolver respuesta REAL de OpenAI (antes estaba ignorada)
    return res.json(respuestaAlexa(respuesta));

  } 
  catch (error) 
  {
    // 🔧 FIX 6: formato Alexa también en errores
    return res.json(respuestaAlexa("El Guardián ha tenido un fallo interno..."));
  }
});

// 🧪 GET de prueba (no toca Alexa)
app.get("/webhook", async (req, res) => {
  try {

    const input = req.query.input || "";

    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    const esApertura = texto === "hola";

    const esSeñal = texto.includes("senal") 
      || texto.includes("orden")
      || texto.includes("ayuda")
      || texto.includes("peligro");

    if (texto.includes("bloqueo"))
    {
      return res.json({ response: "Muévete. Gira sobre ti misma." });
    }

    if (esApertura) 
      {
        return res.json({ response: "El tablero responde..." });
      }

    if (esSeñal) 
      {
        return res.json({ response: "Una sola acción. Nada más." });
      }
    return res.json({ response: "El Guardián escucha..." });

  } 
  catch (error) 
  {
    return res.json({ response: "Error en GET..." });
  }
});

// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto " + PORT);
});
