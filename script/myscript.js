// adding functions to some buttons after the document is fully loaded.
document.addEventListener('DOMContentLoaded', function () {

	// adding click event for read button
	const read_button = document.querySelector("#readbutton");
	read_button.addEventListener('click', () => create_table())
	// adding click event for reset button
	const reset_button = document.querySelector("#resetbutton");
	reset_button.addEventListener('click', () => reset())

	// adding click event for AI button
	const ai_button = document.querySelector("#aibutton");
	ai_button.addEventListener('click', () => doTheThing())

	// adding enter key event for prompt field
	const promptField = document.querySelector("#prompt");
	promptField.addEventListener("keyup", function (event) {
		if (event.key === "Enter") {
			doTheThing();
		}
	})

})

async function read_file(file) {

	// create a file reader Object
	let reader = new FileReader();
	// read file as text
	reader.readAsText(file)
	// await the file to be read.
	await new Promise(resolve => reader.onload = () => resolve());

	// return filename and filecontent with keys.
	return await {
		filename: file.name,
		filecontent: reader.result
	}
}

// function to parse xliff file content as an XML file. This will allow us to use HTML DOM
function xml_parser(xmlcontent) {
	let parser = new DOMParser;
	let xmldoc = parser.parseFromString(xmlcontent, "text/xml");
	return xmldoc;
}

// this function creates a table with contents of xliff files.
async function create_table() {
	// call reset function first to remove table rows to avoid appending the table.
	reset();
	// get the files chosen by user in HTML. we use the id choosefiles in HTML file.
	const files = document.getElementById("choosefiles").files || [];

	// if there are files chosen by the user, below codes will run.
	if (files.length) {
		for (let i = 0; i < files.length; i++) {
			// store filename and filecontent in reading variable.
			let reading = await read_file(files[i]);
			// parse the xmlcontent in xliff file as XML.
			let doc = xml_parser(reading.filecontent);

			// select all trans-units
			const trans_units = doc.querySelectorAll("xliff trans-unit");

			// run below code for each trans-unit
			trans_units.forEach(function (unit) {

				// select source segments
				const source_seg = unit.querySelectorAll("source");

				// select target segments
				const target_seg = unit.querySelectorAll("target");

				// run below code for each source segment. i is used as an index to find the equaivalent target segment for each source segment.
				source_seg.forEach(async function (seg, i) {

					// create a table row for each source segment.
					const row = document.createElement("tr");
					// give a class to each row.
					row.classList.add("myrows");

					// create new table cell for file name info
					const filename_data = document.createElement("td");
					// create new table cell for target segment status.
					const status_data = document.createElement("td");
					// create new table cell for source text
					const sourcetext_data = document.createElement("td");
					// give a class to each source text cell in the table.
					sourcetext_data.classList.add("sourcetext");
					// create new table cell for target text
					const targettext_data = document.createElement("td");
					// give a class to each source text cell in the table.
					targettext_data.classList.add("targettext");

					// build table columns in the table body.
					const tablerow = document.querySelector("#tbody").appendChild(row);
					tablerow.appendChild(filename_data);
					tablerow.appendChild(status_data);
					tablerow.appendChild(sourcetext_data);
					tablerow.appendChild(targettext_data);

					// fill in filename column using filename key from read_file function.
					filename_data.innerHTML = reading.filename;

					// if target segments has state write them to Status column, if not write undefined.
					if (target_seg[i].hasAttribute("state")) {
						status_data.innerHTML = target_seg[i].getAttribute("state");
					} else {
						status_data.innerHTML = "undefined";
					}

					// write source text to Source column
					sourcetext_data.innerHTML = seg.innerHTML;
					// write target text to Target column
					targettext_data.innerHTML = target_seg[i].innerHTML;
				});
			});
		}
	}
}

// function to remove all table rows from the HTML page.
function reset() {

	let rows = document.querySelector("#tbody").querySelectorAll("tr");

	rows.forEach(function (element) {
		element.remove();
	});
}

// sending data to AI and getting result
async function sendToAI(source, target, prompt, api, temp) {

	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");

	var raw = JSON.stringify({
		"contents": [
			{
				"parts": [
					{
						"text": `input1:${source} input2:${target} ${prompt}`
					}
				]
			}
		],
		"generationConfig": {
			"temperature": temp,
			"topK": 1,
			"topP": 1,
			"maxOutputTokens": 2048,
			"stopSequences": []
		},
		"safetySettings": [
			{
				"category": "HARM_CATEGORY_HARASSMENT",
				"threshold": "BLOCK_MEDIUM_AND_ABOVE"
			},
			{
				"category": "HARM_CATEGORY_HATE_SPEECH",
				"threshold": "BLOCK_MEDIUM_AND_ABOVE"
			},
			{
				"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
				"threshold": "BLOCK_MEDIUM_AND_ABOVE"
			},
			{
				"category": "HARM_CATEGORY_DANGEROUS_CONTENT",
				"threshold": "BLOCK_MEDIUM_AND_ABOVE"
			}
		]
	});

	var requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	try {
		let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${api}`, requestOptions)
		let result = await response.json();

		return result;
	}

	catch (error) {
		console.log(error);
	}

}

// function to run when AI button is clicked.
async function doTheThing() {
	placeAPI();
	let apiKey = document.getElementById("placedapi").textContent;
	let temp = document.getElementById("temperature").value
	// get source and target texts from html table.
	let sourceArray = document.querySelectorAll(".sourcetext");
	let targetArray = document.querySelectorAll(".targettext");
	
	// clean AI Output column or append.
	let aiColumn = document.querySelectorAll(".aioutput");
	let overwritePref = document.getElementById("columnpref");
	if (overwritePref.value === "yes") {
		for (let i = 0; i < aiColumn.length; i++) {
			let item = aiColumn[i];
			item.remove();
		}
	}
	// get prompt and input preference.
	let prompt = document.getElementById("prompt").value;
	let inputs = document.getElementById("inputpref").value;

	// send the prompt for each segment.
	for (let i = 0; i < sourceArray.length; i++) {
		let sourceItem = sourceArray[i].innerText;
		let targetItem = targetArray[i].innerText;
		if (inputs === "source") {
			targetItem = undefined;
		} else if (inputs === "target") {
			sourceItem = undefined;
		}
		let aiOutput = await sendToAI(sourceItem, targetItem, prompt, apiKey, temp);

		// to avoid errors with API result
		if (aiOutput.candidates[0].content !== undefined) {
			let outputText = aiOutput.candidates[0].content.parts[0].text
			const aiData = document.createElement("td");
			aiData.classList.add("aioutput")
			aiData.textContent = outputText;
			sourceArray[i].parentElement.appendChild(aiData);
		}
	}
}

// place API key into HTML and hide it.
function placeAPI() {
	let apiPlace = document.getElementById("placedapi");
	if (apiPlace.textContent.length === 0) {
		let apiInput = document.getElementById("apikeygemini");
		apiPlace.textContent = apiInput.value;
		apiInput.value = "";
		apiInput.style.display = "none";
	}
}