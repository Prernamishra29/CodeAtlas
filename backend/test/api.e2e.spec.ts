import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AppModule } from "../src/app.module";

const live = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET && process.env.RUN_API_TESTS === "1");

describe.skipIf(!live)("API e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects invalid login payloads", async () => {
    await request(app.getHttpServer()).post("/auth/login").send({ email: "nope" }).expect(400);
  });

  it("registers, imports a public URL shape, and creates an analysis record path", async () => {
    const email = `phase6-${Date.now()}@example.com`;
    const auth = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, name: "Phase Six", password: "password12" })
      .expect(201);
    expect(auth.body.accessToken).toBeTruthy();
    expect(auth.body.refreshToken).toBeTruthy();

    const token = auth.body.accessToken as string;
    const created = await request(app.getHttpServer())
      .post("/repositories")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://github.com/facebook/react", branch: "main" })
      .expect(201);
    expect(created.body.url).toBe("https://github.com/facebook/react");

    const analysis = await request(app.getHttpServer())
      .post(`/repositories/${created.body.id}/analyze`)
      .set("Authorization", `Bearer ${token}`)
      .expect(202);
    expect(analysis.body.analysisId).toBeTruthy();
  });
});
