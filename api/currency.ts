import * as currency from "../db/interfaces/currency";

export function Publish(Symbol: string) {
  if (!Symbol || Symbol.length === 0) {
      console.log("Null currency symbols are not permitted; ")
  }
  else
  {
    currency.bySymbol(Symbol)
        .then(response => {
            if (response.length === 0)
                currency.add(Symbol,'NoImage.png')
                    .then(response => console.log(response))
                    .catch (error => console.log("Database error occured; ",error))
        .catch((error) => console.log(error));
   })
}};

