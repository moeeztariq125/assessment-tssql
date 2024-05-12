import { beforeAll, describe, expect, it } from "vitest";
import resetDb from "../helpers/resetDb";
import { createCaller } from "../helpers/utils";
import db, { schema } from "../../db/client";
import { eq } from "drizzle-orm";
import { trpcError } from "../../trpc/core";
import { upgradePriceCalculator } from "../../modules/plans/model";

describe("plans routes", async () => {
    beforeAll(async()=>{
        await resetDb()
    })
    describe("register", async () => {
        const user = {
          email: "mail@mail.com",
          password: "P@ssw0rd",
          name: "test",
          timezone: "Asia/Riyadh",
          locale: "en",
        };
        it("should create user successfully", async () => {
          const user = {
            email: "mail@mail.com",
            password: "P@ssw0rd",
            name: "test",
            timezone: "Asia/Riyadh",
            locale: "en",
          };
          const registeredUserRes = await createCaller({}).auth.register(user);
          expect(registeredUserRes.success).toBe(true);
          const userIndb = await db.query.users.findFirst({
            where: eq(schema.users.email, user.email),
          });
          expect(userIndb).toBeDefined();
          expect(userIndb!.email).toBe(user.email);
          expect(userIndb!.name).toBe(user.name);
          expect(userIndb!.hashedPassword).not.toBe(user.password);
          expect(userIndb!.hashedPassword!.length).toBeGreaterThan(0);
          expect(userIndb!.id).toBeDefined();
          expect(userIndb!.createdAt).toBeDefined();
          expect(userIndb!.updatedAt).toBeDefined();
          expect(userIndb!.emailVerified).toBe(false);
        });
        it("should throw error on duplicate user", async () => {
          await expect(createCaller({}).auth.register(user)).rejects.toThrowError(
            new trpcError({
              code: "BAD_REQUEST",
            })
          );
        });
      });
    describe("create plans", async () => {
        const user = {
          email: "mail@mail.com",
          password: "P@ssw0rd",
          rememberMe: true,
        };
        let accessToken:string;
        it("should not login user if not verified", async () => {
          await expect(createCaller({}).auth.login(user)).rejects.toThrowError(
            new trpcError({
              code: "NOT_FOUND",
            })
          );
        });
        it("should login user if verified", async () => {
          await db
            .update(schema.users)
            .set({ emailVerified: true })
            .where(eq(schema.users.email, "mail@mail.com"));
          const loginResponse = await createCaller({
            res: { setCookie: (header,value) => {header=='accessToken'?(accessToken=value):null} },
          }).auth.login(user);
          expect(loginResponse.success).toBe(true);
        });
        it("should create a new plan", async() => {
            const planResponse = await createCaller({req:{cookies:{accessToken}}}).plansRouter.createPlan({
                planName:'test plan',
                planPrice:123
            })
            expect(planResponse.success).toBe(true)
        })
        it("should fetch all plans",async()=>{
            const plans = await createCaller({req:{cookies:{accessToken}}}).plansRouter.getPlan()
            expect(plans.success).toBe(true)
            expect(plans.plans.length).toBe(1)
        })
        it("should update plan details", async()=>{
            const updatePlanResponse = await createCaller({req:{cookies:{accessToken}}}).plansRouter.updatePlan({
                planId:1,
                planName:'test plan 2',
                planPrice: 321
            })
            expect(updatePlanResponse.success).toBe(true)
            const plans = await createCaller({req:{cookies:{accessToken}}}).plansRouter.getPlan()
            const planName = plans.plans[0]?.name;
            const planPrice = plans.plans[0]?.price;
            expect(planName).toBe('test plan 2')
            expect(planPrice).toBe(321)
        })
        it("should create a second plan", async() => {
            const planResponse = await createCaller({req:{cookies:{accessToken}}}).plansRouter.createPlan({
                planName:'test plan 3',
                planPrice:453
            })
            expect(planResponse.success).toBe(true)
            const plans = await createCaller({req:{cookies:{accessToken}}}).plansRouter.getPlan()
            const upgradePrice = await upgradePriceCalculator({oldPlanId:plans.plans[0]?.id!,newPlanId:plans.plans[1]?.id!,currentDateString:'2024-02-26T00:00:00Z'})
            expect(upgradePrice).toBeCloseTo(419.793,3)
        })
      });
})