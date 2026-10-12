export default {
  async fetch(
    request: Request
  ): Promise<Response> {
    return new Response(
      "Rubiks Worker is running.",
      {
        headers: {
          "content-type": "text/plain; charset=utf-8"
        }
      }
    );
  }
};
