#!/usr/bin/bash

path='/home/djorgenson/Projects/blofin-data'

if [ -z "$1" ]; then
    echo "Account: -a"
    echo "Instrument: -i"
    echo "Contract: -ctype"
    echo "Currency: -sym"
    echo "Type: -itype"
    echo "Period: -p"
    echo "Detail: -d"
    echo "State: -s"
    echo "KeySet: -K"
    echo "Bars: -bars"
    echo "Broker: -b"
    echo "Role: -r"
    echo "Order: -ord"
    echo "Request: -req"
    echo "Positions: -pos"
    echo "User: -u"
    echo "Login: -login"
    echo "Area: -area"
    echo "Environ: -e"
    echo "Reference: -ref"

    exit 0
fi

json=$(echo $2,$3,$4,$5 | sed -r 's/\{/\{\"/g' | sed -r 's/\}/\"}/g' | sed -r 's/:/\":\"/g' | sed -r 's/,/\",\"/g')
json=$(echo "${json%\}*}"})

(cd $path && npx tsx query $1 "$json")

#echo $json
