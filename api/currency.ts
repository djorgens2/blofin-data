import * as currency from "../db/interfaces/currency";

export function Publish(Symbol: string, Suspense: boolean) {
  if (!Symbol || Symbol.length === 0) {
      console.log("Null currency symbols are not permitted; ")
  }
  else
  {
    currency.bySymbol(Symbol)
        .then(response => {
            if (response.length === 0) {
                currency.add(Symbol,'./Images/Currency/NoImage.png', Suspense)
                    .then(response => response)
            }
            else {
                if (response[0].symbol === Symbol && Suspense) {
                    currency.setSuspense(response[0].currency, Suspense)
                        .then(response => response)
            }}
          })
        .catch (error => console.log("Database error occured; ",error))
  }};

