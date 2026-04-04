import PocketBase from 'pocketbase'

// Se VITE_PB_URL è impostato (build custom) usalo,
// altrimenti usa lo stesso host/porta da cui è stata caricata la pagina.
// Questo permette l'accesso da qualsiasi dispositivo sulla rete locale.
const PB_URL = import.meta.env.VITE_PB_URL ||
  `${window.location.protocol}//${window.location.hostname}:8090`

export const pb = new PocketBase(PB_URL)
export default pb
