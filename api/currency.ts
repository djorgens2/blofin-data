import * as currency from "../db/interfaces/currency";

export async function Publish(Symbol: string, Suspense: boolean): Promise<number> {
  if (!Symbol || Symbol.length === 0) {
      console.log("Null currency symbols are not permitted; ")
  }
  else
  {
    currency.bySymbol(Symbol)
        .then(async response => {
            if (response.length === 0) {
                await currency.add(Symbol,'./public/images/NoImage.png', Suspense)
                    .then(result => { return result.insertId })
            }
            else {
                if (response[0].symbol === Symbol && Suspense) {
                    currency.setSuspense(response[0].currency, Suspense)
                        .then(result => result);
                return response[0].currency;
            }}
          })
        .catch (error => console.log("Database error occured; ",error))
  }
  return -1
};

