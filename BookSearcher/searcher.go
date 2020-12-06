package main

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/tealeg/xlsx"
)

const SheetTitle = "Books"

var month = map[string]int{"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7,
	"Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}

type Book struct {
	Title       string
	Author      string
	Read        bool
	DateRead    time.Time
	Owned       bool
	InGoodreads bool
}

var title = ""
var author = ""
var read = false
var dateRead = time.Time{}
var owned = true
var inGoodreads = true

var books *xlsx.Sheet
var allBookObjects []Book

func findBookInventory() {
	wb, err := xlsx.OpenFile("../Book_Inventory.xlsx")
	if err != nil {
		panic(err)
	}

	for _, sheet := range wb.Sheets {
		if sheet.Name == SheetTitle {
			fmt.Println("Found the Books sheet in excel")
			books = sheet
			break
		}
	}
}

func cellVisitor(c *xlsx.Cell) error {
	num := reflect.ValueOf(c).Elem().FieldByName("num").Int()
	value, err := c.FormattedValue()

	switch num {
	case 0:
		title = value
	case 1:
		author = getAuthor(value)
	case 2:
		read = getRead(value)
	case 3:
		dateRead = getReadDate(value)
	case 4:
		owned = getOwned(value)
	case 6:
		inGoodreads = getInGoodreads(value)
		allBookObjects = append(allBookObjects, Book{
			Title:    title,
			Author:   author,
			Read:     read,
			DateRead: dateRead,
			Owned:    owned})
	}

	if err != nil {
		fmt.Println(err.Error())
	}
	return err
}

func roWVisitor(r *xlsx.Row) error {
	return r.ForEachCell(cellVisitor)
}

func buildBookList() {
	books.ForEachRow(roWVisitor)
}

//helper functions
func getAuthor(s string) string {
	nameParts := strings.Split(s, ",")
	if len(nameParts) == 2 {
		firstName := strings.Trim(nameParts[1], " ")
		firstName = strings.Replace(firstName, "", ",", -1)
		lastName := strings.Trim(nameParts[0], " ")
		return firstName + " " + lastName
	}
	return s
}
func getRead(s string) bool {
	if s == "Yes" {
		return true
	} else {
		return false
	}
}

func getReadDate(s string) time.Time {
	if s == "N/A" {
		return time.Time{}
	} else {
		arr := strings.Split(s, "-")
		if len(arr) == 1 && arr[0] == "Date Read" {
			return time.Time{}
		}
		year, _ := strconv.Atoi("20" + arr[2])
		month := month[arr[1]]
		return time.Date(year, time.Month(month), 1, 1, 1, 1, 0, time.UTC)
	}
}

func getInGoodreads(s string) bool {
	if s == "In Goodreads" {
		return false
	}
	if s == "Yes" {
		return true
	} else {
		return false
	}
}

func getOwned(s string) bool {
	if s == "Owned" {
		return false
	}
	if s == "Yes" {
		return true
	} else {
		return false
	}
}

func RemoveIndex(slice []Book, index int) []Book {
	return append(slice[:index], slice[index+1:]...)
}
func main() {
	findBookInventory()
	buildBookList()
	allBookObjects = RemoveIndex(allBookObjects, 0)
}
