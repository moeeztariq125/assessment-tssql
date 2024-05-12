import { eq } from "drizzle-orm";
import db, { schema } from "../../db/client";
import { trpcError } from "../../trpc/core";

export const upgradePriceCalculator = async ({oldPlanId, newPlanId, currentDateString}:{oldPlanId:number, newPlanId:number, currentDateString:string}) => {
    const currentDate = new Date(currentDateString)
    const oldPlan = await db.query.plans.findFirst({where:eq(schema.plans.id,oldPlanId)})
    if(!oldPlan){
        throw new trpcError({code:'NOT_FOUND'})
    }
    const newPlan = await db.query.plans.findFirst({where:eq(schema.plans.id,newPlanId)})
    if(!newPlan){
        throw new trpcError({code:'NOT_FOUND'})
    }
    if(oldPlan.price > newPlan.price){  //Plan can only be upgraded not downgraded
        throw new trpcError({code:'BAD_REQUEST'})
    }
    const remainingDays = getRemainingDaysOfMonth(currentDate);
    const totalDaysOfMonth = getTotalDaysOfMonth(currentDate);
    const oldPlanPricePerDay = oldPlan.price/totalDaysOfMonth;
    const proratedAmount = oldPlanPricePerDay * remainingDays
    const upgradePrice = newPlan.price - proratedAmount
    return upgradePrice
}


function getRemainingDaysOfMonth(currentDate:Date) {
    // Get the last day of the current month
    const lastDayOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0,0,0,0,0));
    // Calculate the remaining days
    const remainingDays = lastDayOfMonth.getDate() - currentDate.getDate();
    return remainingDays;
  }

function getTotalDaysOfMonth(currentDate:Date) {
    // Create a Date object for the next month
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const nextMonth = new Date(currentYear, currentMonth + 1, 0);
    // Get the day of the month, which represents the total number of days in the month
    const totalDays = nextMonth.getDate();
    return totalDays;
  }