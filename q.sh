#!/usr/bin/bash

path='/home/djorgenson/Projects/blofin-data'

if [ -z "$1" ]; then
    echo "Usage: q.sh <subject> <json>"
    printf "\nSubjects:\n\n"
    echo "-a: Accounts"
    echo "-auth: Authority"
    echo "-sym: Currency Symbol"
    echo "-p: Periods"
    echo "-i: Instruments"
    echo "-ctype: Instrument Contract"
    echo "-itype: Instrument Type"
    echo "-ip: Instrument Periods"
    echo "-ipos: Instrument Positions"
    echo "-s: States"
    echo "-bars: Bars"
    echo "-b: Brokers"
    echo "-r: Roles"
    echo "-ord: Orders"
    echo "-soq: StopsAPI"
    echo "-q: Request Queue"
    echo "-pos: Positions"
    echo "-so: Stop Orders"
    echo "-u: Users"
    echo "-login: Login"
    echo "-task: Tasks \{Activities\}"
    echo "-area: Subject Areas"
    echo "-e: Environs"
    echo "-ref: References"

    printf "\nExamples:\n\n"
    echo "Example: q.sh -a '{\"account\":\"0x1234567890abcdef\"}'"
    echo "Example: q.sh -i '{\"instrument\":\"0xabcdef1234567890\"}'"
    echo "Example: q.sh -pos '{\"instrument_position\":\"0xabcdef1234567890\", \"state\":\"0x1234567890abcdef\"}'"
    echo "Example: q.sh -ip '{\"instrument_position\":\"0xabcdef1234567890\", \"state\":\"0x1234567890abcdef\", \"base_currency\":\"0x1234567890abcdef\", \"quote_currency\":\"0xabcdef1234567890\"}'"

    exit 1
fi 

if [ -z "$2" ]; then
    echo "JSON argument is required."
    exit 1
fi
if [[ "$1" != "-a" && "$1" != "-auth" && "$1" != "-i" && "$1" != "-ctype" && "$1" != "-sym" && "$1" != "-itype" && "$1" != "-p" && "$1" != "-d" && "$1" != "-q" && "$1" != "-s" &&  "$1" != "-bars" && "$1" != "-b" && "$1" != "-r" && "$1" != "-ord" && "$1" != "-soq" && "$1" != "-pos" && "$1" != "-so" && "$1" != "-u" && "$1" != "-login" && "$1" != "-task" && "$1" != "-area" && "$1" != "-e" && "$1" != "-ref" && "$1" != "-ip" && "$1" != "-ipos" ]]; then
    echo "Invalid subject: $1"
    exit 1
fi
# if [[ "$1" == "-ip" && ! "$2" =~ \"instrument_position\" ]]; then
#     echo "Instrument Position subject requires 'instrument_position' in JSON."
#     exit 1
# fi 
# if [[ "$1" == "-pos" && ! "$2" =~ \"instrument_position\" ]]; then
#     echo "Positions subject requires 'instrument_position' in JSON."
#     exit 1
# fi
# if [[ "$1" == "-ip" && ! "$2" =~ \"state\" ]]; then
#     echo "Instrument Position subject requires 'state' in JSON."
#     exit 1
# fi
# if [[ "$1" == "-pos" && ! "$2" =~ \"state\" ]]; then
#     echo "Positions subject requires 'state' in JSON."
#     exit 1
# fi
# if [[ "$1" == "-ip" && ! "$2" =~ \"base_currency\" ]]; then
#     echo "Instrument Position subject requires 'base_currency' in JSON."
#     exit 1
# fi
# if [[ "$1" == "-ip" && ! "$2" =~ \"quote_currency\" ]]; then
#     echo "Instrument Position subject requires 'quote_currency' in JSON."
#     exit 1
# fi
# if [[ "$1" == "-ip" && ! "$2" =~ \"auto_trade\" ]]; then
#     echo "Instrument Position subject requires 'auto_trade' in JSON."
#     exit 1
# fi
# if [[ "$1" == "-pos" && ! "$2" =~ \"auto_trade\" ]]; then
#     echo "Positions subject requires 'auto_trade' in JSON."
#     exit 1
# fi
# if [[ ! -d "$path" ]]; then
#     echo "Path does not exist: $path"
#     exit 1
# fi
# if ! command -v npx &> /dev/null; then
#     echo "npx is not installed. Please install Node.js and npm."
#     exit 1
# fi
# if ! command -v tsx &> /dev/null; then
#     echo "tsx is not installed. Please install it using 'npm install -g tsx'."
#     exit 1
# fi
# if ! command -v jq &> /dev/null; then
#     echo "jq is not installed. Please install it to process JSON."
#     exit 1
# fi
# Convert JSON to a format suitable for the query
# This assumes the input JSON is a single object with no nested objects or arrays
# Example: {"key1":"value1","key2":"value2"} becomes "key1":"value1","key2":"value2"
# The sed commands are used to format the JSON string for the query
# It replaces { with {" and } with "} and formats the keys and values
# Note: This is a simple transformation and may not handle all JSON cases correctly
# Ensure the JSON is properly formatted for the query
# Example input: {"key1":"value1","key2":"value2"}
# Example output: "key1":"value1","key2":"value2"
# The output is then wrapped in curly braces to form a valid JSON object
# Example output: {"key1":"value1","key2":"value2"}
# The final output is a JSON object that can be passed to the query

json=$(echo $2,$3,$4,$5 | sed -r 's/\{/\{\"/g' | sed -r 's/\}/\"}/g' | sed -r 's/:/\":\"/g' | sed -r 's/,/\",\"/g')
json=$(echo "${json%\}*}"})

(cd $path && npx tsx query $1 "$json")

#echo $json
