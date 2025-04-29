import { GetDataFunc } from './getData';
import { UpdateFunc } from './update';
import { BuyFunc, ScheduleBuy } from './buy';
import { SellFunc, ScheduleSell } from './sell';

// entrypoint for firebase functions
export const getData = GetDataFunc;
export const update = UpdateFunc;
export const buy = BuyFunc;
export const sell = SellFunc;

// scheduled functions
exports.scheduleBuy = ScheduleBuy;
exports.scheduleSell = ScheduleSell;
