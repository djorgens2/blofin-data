import * as Instrument from "./db/interfaces/instrument";

function Example1() {
  const jsonString = '{"name": "John Doe", "age": 30, "city": "New York"}';
  const obj = JSON.parse(jsonString);

  console.log(obj);
  console.log(obj.name); // Output: John Doe
  console.log(obj.age); // Output: 30
  console.log(obj.city); // Output: New York
}

// script.js
function parser<T>(arg: string): Partial<T> {
  const obj:Partial<T> = {};

  try {
    const json = JSON.parse(arg);

    if (typeof json === "object" && json !== null) {
      const obj: Partial<T> = json;
      console.log(obj);
      return obj;
    }
  } catch (error) {
      const parts = arg.split("=");
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parts[1].trim();
        obj[key] = value;            
    };
    return obj;
  }
  
  return obj;
}

async function get<T>(props: T) {
  const instrument = await Instrument.Key(props);
  console.log("Fetch Instrument:", props, instrument);
}

Example1();
const [cli_props] = process.argv.slice(2);
get<Partial<Instrument.IKeyProps>>(parser<Partial<Instrument.IKeyProps>>(cli_props));
//process.exit (0);
      // Object.keys(parsed).forEach(key => {
      // if (Array.isArray(parsed.key)) {
      //   obj[key].forEach(item => obj[key].push(item))

      // } else if (Array.isArray(parsed.currency)) {
      //   obj.currency = parsed.currency;
      // }
      // })
