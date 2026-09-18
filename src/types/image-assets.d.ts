// Tipado de los assets que se importan desde código para que el bundler los empaquete.
// El build de Angular copia la imagen y entrega la URL final; TS necesita la declaración.
declare module '*.png' {
  const url: string;
  export default url;
}