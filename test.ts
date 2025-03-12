import { CEvent, Event, Alert } from "@class/event";

const event: CEvent = new CEvent();

console.log(event);

event.setEvent(Event.NewHour, Alert.Major);
event.setEvent(Event.NewHigh, Alert.Nominal);
event.setEvent(Event.NewBoundary, Alert.Minor);
event.setEvent(Event.NewLow, Alert.Minor);
event.setEvent(Event.NewOutsideBar, Alert.Major);

console.log(event.eventText(Event.NewDay));
console.log(event.activeEvents());

// function somePromise() {
//     return new Promise((resolve, reject) => {
//       setTimeout(() => {
//         const success = Math.random() < 0.8; // Simulate success or failure randomly
//         if (success) {
//           resolve('Operation completed successfully');
//         } else {
//           reject('Operation failed');
//         }
//       }, 1000);
//     });
//   }
  
// async function myAsyncFunction() {
//     try {
//       const result = await somePromise();
//       // This code runs after somePromise() resolves
//       console.log('Promise resolved with:', result);
//       return result; // Optionally return the result
//     } catch (error) {
//       // This code runs if somePromise() rejects
//       console.error('Promise rejected with:', error);
//       throw error; // Re-throw the error to propagate it further if needed
//     } finally {
//       // This code always runs after the try/catch block, regardless of the Promise's outcome
//       console.log('Finally block executed');
//     }
//   }
  
//   async function runAsyncFunction() {
//     try {
//       const finalResult = await myAsyncFunction();
//       console.log('myAsyncFunction completed successfully with:', finalResult);
//     } catch (error) {
//        console.error('myAsyncFunction failed with:', error);
//     }
//   }
  
//   runAsyncFunction(); // Call the async function to start the process
  
