
//global variables
var oFileIn;
var author;
var columns;
var allBooks = [];
var booksByAuthor = [];
var fileName;


$(function () {
	// oFileIn = document.getElementById('my_file_input');
	// if (oFileIn.addEventListener) {
	// 	oFileIn.addEventListener('onchange', loadBooks, false);
	// }
	//events
	$("#my_file_input").change(loadBooks);
	// $("#loadBooks").click(loadBooks);
	$("#addBook").click(addBook);
	$("#removeBook").click(removeBook);
	$("#haveRead").click(searchBook);
	$("#authorRead").click(searchAuthor);
	$("#noBooksError").hide();
	$("#showBooks").click(showBooksByAuthor);
	$("#myModal").hide();
	$("#showBooks").hide();
	$("#askManager").hide();
	$("#bookOpenIcon").hide();

});


function loadBooks(oEvent) {
	let allBooks = [];
	let oFile = oEvent.target.files[0];
	let sFileName = oFile.name;
	fileName = oFile.name;
	if (booksCache.get(sFileName) != null) {
		var shouldUpdate = confirm("This file is already present. Do you want to update its content?")
		if (shouldUpdate) {
			loadBooksFromFile(oEvent, booksCache.update);
		}
		else {
			allBooks = booksCache.get('Book Inventory.xls');
		}
	}
	else {
		allBooks = booksCache.get('Book Inventory.xls');
	}
	$("#loadBooks").addClass("btnDisabled");
	$("#askManager").show();
}

function loadBooksFromFile(oEvent, callBack) {
	let allBooks = [];
	let oFile = oEvent.target.files[0];
	let sFileName = oFile.name;
	booksCache.setFileName(sFileName);
	let reader = new FileReader();

	reader.onload = function (e) {
		let data = e.target.result;
		let cfb = XLS.CFB.read(data, {
			type: 'binary'
		});
		let wb = XLS.parse_xlscfb(cfb);
		wb.SheetNames.forEach(function (sheetName) {
			if (sheetName === "Books") {
				let sCSV = XLS.utils.make_csv(wb.Sheets[sheetName]);
				var data = XLS.utils.sheet_to_json(wb.Sheets[sheetName], {
					header: 1
				});
				var columns = data.splice(0, 1);
				booksCache.addColumns("columns", columns);
				$.each(data, function (indexR, valueR) {
					let book = buildBookObject(columns, valueR);
					allBooks.push(book);
				});
			}
		});
		callBack(sFileName, allBooks);
	}
	reader.readAsBinaryString(oFile);
}


var booksCache = {
	setFileName: function (value) {
		localStorage.setItem("fileName", value);
	},

	columns: JSON.parse(localStorage.getItem("columns")),
	addColumns: function (key, value) {
		if (localStorage.getItem(key) == null) {
			localStorage.setItem(key, JSON.stringify(value));
			this.columns = JSON.parse(localStorage.getItem(key));
		}
	},
	add: function (key, value) {
		if (localStorage.getItem(key) == null) {
			localStorage.setItem(key, JSON.stringify(value));
		}
	},

	get: function () {
		let fileName = localStorage.getItem("fileName");
		return JSON.parse(localStorage.getItem(fileName));
	},
	clear: function () {
		localStorage.clear();
	},
	update: function (value) {
		let fileName = localStorage.getItem("fileName");
		if (localStorage.getItem(fileName) != null)
			console.log(`Books cache for key: ${fileName} was updated with new value`);
		else
			console.log(`Key: ${fileName} was not present in cache, adding item`);
		localStorage.setItem(fileName, JSON.stringify(value));
	},
	remove: function () {
		let fileName = localStorage.getItem("fileName");
		if (localStorage.getItem(fileName)) {
			console.log(`Key: ${fileName} was not present in cache, nothing to remove`);
			return;
		}
		localStorage.removeItem(fileName);
	}
}

function buildBookObject(columns, bookValue) {
	var book = {};
	for (var i = 0; i < columns[0].length; i++) {
		book[columns[0][i]] = bookValue[i];
	};
	return book;
}

function searchBook() {
	$("#bookOpenIcon").hide();
	$("#bookOpenIcon").html("");
	var bookToSearch = $("#bookName").val().trim();
	let books = booksCache.get(fileName);
	let titles = books.map(a => a.Title.toUpperCase());
	var fuzzySet = FuzzySet(titles);

	for (var i = 0; i < allBooks.length; i++) {
		var normalizedTitle = normalizeString(allBooks[i]["Title"]);
		// find book title and check if it was read
		var haveReadBook = allBooks.filter(book => {
			return normalizeString(book["Title"]).toUpperCase() == bookToSearch.toUpperCase()
				&& book["Read"] == "Yes"
		});
		if (haveReadBook.length == 1) {
			for (let i = 0; i < 3; i++) {
				var icon = '<i class="fas fa-book-open" style="margin-left:10px"></i>';
				$("#bookOpenIcon").append(icon);
			}
			$("#bookOpenIcon").fadeIn("slow");
			return;
		}
		if (haveReadBook.length > 1) {
			console.log(`Found ${haveReadBook.length} with this title`);
			return;
		}
		var notReadBook = allBooks.filter(book => { return normalizeString(book["Title"]).toUpperCase() == bookToSearch.toUpperCase() && book["Read"] == "No" });
		if (notReadBook.length == 1) {
			console.log("Found the book, but you haven't read it");
			return;
		}
		var unknownReadBook = allBooks.filter(book => { return normalizeString(book["Title"]).toUpperCase() == bookToSearch.toUpperCase() && book["Read"] == "N/A" });
		if (unknownReadBook.length == 1) {
			console.log("Found the book, but I don't know if you've read it");
			return;
		}
	};
	var fuzzy = fuzzySet.get(bookToSearch.toUpperCase(), "", 0.2);
	var fuzzyMatches = "";
	if (fuzzy.length > 0) {
		showReadBooks(fuzzy);
		console.log("I didn't find the book but here are some guesses: " + fuzzyMatches);
	}
}

function addBook() {
	let newBookModal = document.getElementById("newBookModal");
	let newBookModalContent = newBookModal.getElementsByClassName("modal-content")[0];
	let addBookForm = buildBookForm();
	newBookModalContent.appendChild(addBookForm);
	$("#newBookModal").show();
	var closeBtn = document.getElementsByClassName('close')[0];
	closeBtn.addEventListener('click', closeModal, false);

}

function buildBookForm() {
	let columnsArr = booksCache.columns;
	var formContainer = document.createElement("div");
	var form = document.createElement("form");
	form.setAttribute("id", "addBookForm");
	columnsArr.forEach((columns) => {
		columns.forEach((column) => {
			console.log(column);
			let formElement = document.createElement("div");
			formElement.classList.add("field");
			let elementLabel = document.createElement("label");
			elementLabel.textContent = column;
			elementLabel.style.display = "block";
			let elementInput = document.createElement("input");
			elementInput.setAttribute("id", column);
			elementInput.setAttribute("name", column);
			elementInput.setAttribute("required", true);
			elementInput.attributes.required = "required";
			formElement.appendChild(elementLabel);
			formElement.appendChild(elementInput);
			form.appendChild(formElement);

		})
	})
	let submitButton = document.createElement("button");
	submitButton.style.width = "112px";
	submitButton.classList.add("btn");
	submitButton.classList.add("btn-primary");
	submitButton.classList.add("submitBookBtn");
	submitButton.setAttribute("id", "submitBook");
	submitButton.textContent = "Submit book"
	submitButton.addEventListener('click', submitBook, false);
	form.appendChild(submitButton);
	formContainer.appendChild(form);
	return formContainer;
}

function submitBook() {
	let columnsArr = booksCache.columns;
	let bookValue = [];
	columnsArr.forEach((columns) => {
		columns.forEach((column) => {
			let columnValue = document.getElementById(column).value;
			bookValue.push(columnValue);
		})
	})
	let bookObject = buildBookObject(columnsArr, bookValue);
	let allBooks = booksCache.get();
	allBooks.push(bookObject);
	booksCache.update("Book Inventory.xls", allBooks);
	alert('book added');
}

function removeBook() {
	alert('removed book');
}

function sleep(miliseconds) {
	var currentTime = new Date().getTime();
	while (currentTime + miliseconds >= new Date().getTime()) {
	}
}

function searchAuthor() {
	booksByAuthor = [];
	var authorTosearch = $("#authorName").val().trim();

	for (var i = 0; i < allBooks.length; i++) {
		var writer = processAuthorName(allBooks[i]["Author"]);
		if (authorTosearch.toUpperCase() === writer.toUpperCase()) {
			author = writer;
			booksByAuthor.push(allBooks[i]["Title"]);
		}
	}

	if (booksByAuthor.length > 0) {
		$("#showBooks").show();
		$("#showBooks").html("Show me the " + booksByAuthor.length + " books");
	}
	else {
		$("#showBooks").html('<i class="fas fa-times-circle" style="margin-left:10px"></i>');
		$("#showBooks").show();
	}
}


function showReadBooks(fuzzyMatches) {
	var booksToShow = "<ul>";
	$("#modalHeader").html('<span class="close" id="closeBtn">x</span>');
	$("#modalText").html("");
	for (var i = 0; i < fuzzyMatches.length; i++) {
		var fNormalized = normalizeString(fuzzyMatches[i][1]);
		var fMatch = fNormalized[0] + fNormalized.substr(1).toLowerCase();
		booksToShow += '<li class="suggestedBook">' + '<i class="fas fa-book-open" style="margin-left:10px;margin-right:3px;"></i>' + fMatch + '</li>';
	}
	booksToShow += "</ul>";
	$("#modalHeader").append("Did you mean:");
	$("#modalText").append(booksToShow);
	$("#myModal").show();
	$("#closeBtn").show();
	var closeBtn = document.getElementsByClassName('close')[0];
	closeBtn.addEventListener('click', closeModal, false);
}

function showBooksByAuthor() {
	$("#modalHeader").html('<span class="close" id="closeBtn">x</span>');
	$("#modalHeader").append(author);
	$("#modalText").html("");
	var booksList = "<ul>";
	for (var i = 0; i < booksByAuthor.length; i++) {
		booksList += "<li>" + booksByAuthor[i] + "</li>";
	}
	booksList += "</ul>";

	$("#modalText").append(booksList);
	$("#myModal").show();
	$("#closeBtn").show();
	var closeBtn = document.getElementsByClassName('close')[0];
	closeBtn.addEventListener('click', closeModal, false);
}

function closeModal() {
	$("#myModal").hide();
	$("#newBookModal").hide();
}

function processAuthorName(authorInput) {
	var nameArr = authorInput.split(',');
	var processedArr = [];
	for (var i = 0; i < nameArr.length; i++) {
		processedArr.push(normalizeString((nameArr[i].replace(/\*/g, '')).trim())); //remove '*', and normalize author
	}
	processedArr.reverse();
	return processedArr.join(' ');
}

function normalizeString(inputStr) {
	var normalized = inputStr.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	return normalized;
}







