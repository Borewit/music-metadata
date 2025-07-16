import { parseWebStream } from 'music-metadata';

(async () => {
  try {
    // Fetch the audio file
    const response = await fetch('https://github.com/Borewit/test-audio/raw/refs/heads/master/Various%20Artists%20-%202008%20-%20netBloc%20Vol%2013%20-%20Color%20in%20a%20World%20of%20Monochrome%20%5BAAC-40%5D/1.02.%20Solid%20Ground.m4a');

    // Extract the Content-Length header and convert it to a number
    const contentLength = response.headers.get('Content-Length');
    const size = contentLength ? Number.parseInt(contentLength, 10) : undefined;

    // Parse the metadata from the web stream
    const metadata = await parseWebStream(response.body, {
      mimeType: response.headers.get('Content-Type'),
      size // Important to pass the content-length
    });

    console.log(metadata);
  } catch (error) {
    console.error('Error parsing metadata:', error.message);
  }
})();
