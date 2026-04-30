declare module 'supertest' {
  interface SuperTestRequest {
    post(url: string): SuperTestRequest;
    get(url: string): SuperTestRequest;
    set(name: string, value: string): SuperTestRequest;
    send(body: unknown): Promise<{ statusCode: number }>;
  }

  export default function request(server: unknown): SuperTestRequest;
}
