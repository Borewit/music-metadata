declare module 'is-stream' {

  /**
   * Return true is provided object is a Node Stream
   * @param stream
   * @return true if provided stream is actually a stream, otherwise false
   */
  function isStream (stream: any): boolean

  export = isStream
}
