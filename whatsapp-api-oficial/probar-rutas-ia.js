// Pruebas del endpoint público /ia/estado, sin red y sin clave.
//
//   node probar-rutas-ia.js
//
// Existe por un caso concreto: el 26-ago-2026 se puso el tope de gasto en
// Render, no quedó guardado, y desde afuera no había forma de notarlo —
// /ia/estado decía lo mismo con tope y sin tope. Se agregaron dos booleanos
// para que se pueda ver, y estas pruebas cuidan lo único delicado de ese
// cambio: que al agregarlos NO se haya publicado de paso el gasto acumulado ni
// el monto del tope, que son datos que no pueden salir a una URL sin login.
//
// El módulo ia.js se reemplaza por uno de mentira, así que estas pruebas no
// dependen de tener clave ni de que Firestore responda.

const assert = require('assert')
const path = require('path')
const express = require('express')

let pasadas = 0
let fallidas = 0

function afirmar(condicion, nombre, detalle) {
  if (condicion) {
    pasadas++
    console.log(`  ✓ ${nombre}`)
  } else {
    fallidas++
    console.log(`  ✗ ${nombre}${detalle !== undefined ? ` — ${JSON.stringify(detalle)}` : ''}`)
  }
}

// --- ia.js de mentira -------------------------------------------------------
// Se planta en require.cache antes de cargar rutas-ia.js, que hace require('./ia').

const rutaIa = require.resolve('./ia')
let estadoSimulado = {}

require.cache[rutaIa] = {
  id: rutaIa,
  filename: rutaIa,
  loaded: true,
  exports: {
    iaDisponible: () => estadoSimulado.activa,
    estadoIa: () => estadoSimulado,
    clasificarReporte: async () => null,
    sonElMismoProblema: async () => null,
    resumirParaCuentaPublica: async () => null,
  },
}

const { crearRouter } = require('./rutas-ia')

// --- Servidor de prueba en un puerto que elige el sistema -------------------

const app = express()
app.use(express.json())
app.use('/ia', crearRouter())

async function pedirEstado(servidor) {
  const { port } = servidor.address()
  const respuesta = await fetch(`http://127.0.0.1:${port}/ia/estado`)
  return { codigo: respuesta.status, cuerpo: await respuesta.json() }
}

async function correr() {
  const servidor = app.listen(0)
  await new Promise((listo) => servidor.once('listening', listo))

  try {
    console.log('\nCon la IA encendida y el tope puesto')
    estadoSimulado = {
      activa: true,
      tiene_clave: true,
      modelo: 'claude-opus-5',
      max_turnos: 6,
      gasto_mes_usd: 3.4567,
      tope_usd_mes: 20,
      tope_alcanzado: false,
    }
    let r = await pedirEstado(servidor)
    afirmar(r.codigo === 200, 'responde 200', r.codigo)
    afirmar(r.cuerpo.activa === true, 'dice que está activa')
    afirmar(r.cuerpo.tope_configurado === true, 'dice que el tope está configurado', r.cuerpo)
    afirmar(r.cuerpo.tope_alcanzado === false, 'dice que no se alcanzó')

    // Lo importante de todo este archivo.
    const publicado = JSON.stringify(r.cuerpo)
    afirmar(!publicado.includes('3.4567'), 'NO publica el gasto acumulado', publicado)
    afirmar(!publicado.includes('20'), 'NO publica el monto del tope', publicado)
    afirmar(!publicado.includes('opus'), 'NO publica el modelo', publicado)
    afirmar(
      Object.keys(r.cuerpo).sort().join(',') === 'activa,tope_alcanzado,tope_configurado',
      'devuelve exactamente tres campos y ninguno más',
      Object.keys(r.cuerpo),
    )

    console.log('\nCon la IA encendida pero SIN tope — el caso que no se podía ver antes')
    estadoSimulado = { ...estadoSimulado, tope_usd_mes: null }
    r = await pedirEstado(servidor)
    afirmar(r.cuerpo.activa === true, 'sigue activa')
    afirmar(r.cuerpo.tope_configurado === false, 'y ahora se ve que el fusible NO está puesto', r.cuerpo)

    console.log('\nCon el tope alcanzado')
    estadoSimulado = { ...estadoSimulado, activa: false, tope_usd_mes: 20, tope_alcanzado: true }
    r = await pedirEstado(servidor)
    afirmar(r.cuerpo.activa === false, 'la IA queda apagada')
    afirmar(r.cuerpo.tope_alcanzado === true, 'y se distingue de "falta la clave"', r.cuerpo)

    console.log('\nSin clave — el otro motivo de activa:false')
    estadoSimulado = {
      activa: false,
      tiene_clave: false,
      modelo: 'claude-opus-5',
      max_turnos: 6,
      gasto_mes_usd: 0,
      tope_usd_mes: null,
      tope_alcanzado: false,
    }
    r = await pedirEstado(servidor)
    afirmar(r.cuerpo.activa === false, 'la IA está apagada')
    afirmar(
      r.cuerpo.tope_alcanzado === false,
      'y NO se confunde con haber gastado el presupuesto',
      r.cuerpo,
    )
  } finally {
    servidor.close()
  }

  console.log(`\n${pasadas} pasadas, ${fallidas} fallidas`)
  if (fallidas > 0) process.exit(1)
}

correr().catch((error) => {
  console.error(error)
  process.exit(1)
})
