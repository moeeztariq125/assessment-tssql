import { z } from "zod";
import { router, protectedProcedure, publicProcedure, trpcError } from "../../trpc/core";
import db, { schema } from "../../db/client";
import { eq } from "drizzle-orm";

export const plansRouter = router({
    createPlan:protectedProcedure
    .input(z.object({
        planName:z.string(),
        planPrice:z.number()
    }))
    .mutation(async ({input})=>{
        const {planName, planPrice} = input;
        await db.insert(schema.plans).values({
            name:planName,
            price: planPrice,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted:false
        })
        return {success:true}
    }),
    updatePlan:protectedProcedure
    .input(z.object({
        planId:z.number(),
        planName:z.string().optional(),
        planPrice:z.number().optional()
    })).mutation(async ({input})=>{
        const {planId, planName, planPrice} = input;
        const plan = await db.query.plans.findFirst({
            where: eq(schema.plans.id,planId)
        })
        if(!plan){
            throw new trpcError({code:"NOT_FOUND"})
        }
        let toSet:any = {}
        planName && (toSet.name = planName);
        planPrice && (toSet.price = planPrice);

        await db.update(schema.plans)
        .set({
            name: planName ?? plan.name,
            price: planPrice ?? plan.price,
            updatedAt: new Date()
        })
        .where(eq(schema.plans.id,planId))
        return {
            success:true,
            planId:plan.id
        }
    }),
    getPlan:publicProcedure
    .query( async ({})=>{
        const plans = await db.query.plans.findMany({where:eq(schema.plans.isDeleted,false)})
        return {success:true, plans}
    })
})