import React, { useState, useEffect, useRef } from "react";
import { Calendar, Users, Clock, MapPin, Calculator } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { format, addDays, isValid } from "date-fns";
import feeFormula from "../../../backend/src/utils/feeFormulas.json";

export default function SafariPricingTool() {
  const [formData, setFormData] = useState({
    clientName: "",
    clientId: "",
    departureDate: null,
    adults: "",
    children: "",
    duration: "",
    itinerary: [{ day: 1, from: "", to: "", hotelLocation: "" }],
  });
  const [results, setResults] = useState(null);
  const [dayHotelInfo, setDayHotelInfo] = useState({});
  const [error, setError] = useState(null);
  const [manualHotelSearch, setManualHotelSearch] = useState(false);
  const [hotelQueries, setHotelQueries] = useState({});
  const [hotelSuggestions, setHotelSuggestions] = useState({});
  const [selectedHotels, setSelectedHotels] = useState({});
  const [allHotels, setAllHotels] = useState({}); // Store hotels by location
  const adults = parseInt(formData.adults) || 0;
  const kids = parseInt(formData.children) || 0;
  const dropdownRefs = useRef({});

  // Location normalization map (for validation only, not API calls)
  const locationNormalization = {
    Ngorongoro: "NG",
    "Lake Manyara": "LM",
    "Central Serengeti": "CS",
    Arusha: "AR",
    Kilimanjaro: "JRO",
    Tarangire: "TA",
    Zanzibar: "ZNZ",
    "Dar es Salaam": "DAR",
    "Northern Serengeti": "NS",
    Ndutu: "ND",
    Lobo: "LE",
    "Loliondo Zebra": "LZ",
    Kogatende: "KR",
    "Western Serengeti": "WS",
    Mikumi: "MS",
  };

  // Fetch hotel suggestions from stored hotels
  const fetchHotelSuggestions = (query, dayIndex) => {
    const location = formData.itinerary[dayIndex].hotelLocation;
    console.log(
      `Fetching suggestions for Day ${
        dayIndex + 1
      }: query="${query}", location="${location}"`
    );

    if (!location || location === "No accommodation needed") {
      console.log(`No suggestions for Day ${dayIndex + 1}: Invalid location`);
      setHotelSuggestions((prev) => ({ ...prev, [dayIndex]: [] }));
      return;
    }

    // Filter stored hotels
    const hotels = allHotels[location] || [];
    const suggestions =
      query.length >= 3
        ? hotels.filter((hotel) =>
            hotel.name.toLowerCase().includes(query.toLowerCase())
          )
        : [];
    console.log(`Suggestions for Day ${dayIndex + 1}:`, suggestions);
    setHotelSuggestions((prev) => ({ ...prev, [dayIndex]: suggestions }));
  };

  // Fetch all hotels for a location
  const fetchAllHotels = async (location, dayIndex) => {
    if (!location || location === "No accommodation needed") {
      console.log(
        `Skipping hotel fetch for Day ${dayIndex + 1}: Invalid location`
      );
      setAllHotels((prev) => ({ ...prev, [location]: [] }));
      return;
    }

    try {
      const formattedDate = formData.departureDate
        ? format(addDays(formData.departureDate, dayIndex), "dd/MM/yyyy")
        : format(new Date(), "dd/MM/yyyy");
      const kidsAges = Array(kids).fill(5);
      console.log(
        `Fetching all hotels for location: ${location}, date: ${formattedDate}`
      );
      const response = await axios.post(
        "https://calculator-gaql.onrender.com/api/hotels/all",
        {
          groupSizeInfo: {
            adults: { count: adults },
            kids: { age: kidsAges },
          },
        },
        {
          params: { location, date: formattedDate }, // Use full location name
        }
      );
      console.log(`Fetched hotels for ${location}:`, response.data);
      setAllHotels((prev) => ({ ...prev, [location]: response.data }));
    } catch (error) {
      console.error(
        `Error fetching hotels for ${location}:`,
        error.response?.data || error.message
      );
      setAllHotels((prev) => ({ ...prev, [location]: [] }));
    }
  };

  // Handle hotel query input
  const handleHotelQuery = (e, dayIndex) => {
    const query = e.target.value;
    console.log(`Hotel query for Day ${dayIndex + 1}: ${query}`);
    setHotelQueries((prev) => ({ ...prev, [dayIndex]: query }));
    fetchHotelSuggestions(query, dayIndex);
  };

  // Handle hotel selection
  const handleHotelSelect = (hotel, dayIndex) => {
    console.log(`Selected hotel for Day ${dayIndex + 1}:`, hotel);
    setSelectedHotels((prev) => ({ ...prev, [dayIndex]: hotel }));
    setHotelQueries((prev) => ({ ...prev, [dayIndex]: "" }));
    setHotelSuggestions((prev) => ({ ...prev, [dayIndex]: [] })); // Close dropdown
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(dropdownRefs.current).forEach((dayIndex) => {
        const ref = dropdownRefs.current[dayIndex];
        if (ref && !ref.contains(event.target)) {
          console.log(
            `Outside click detected, closing dropdown for Day ${
              parseInt(dayIndex) + 1
            }`
          );
          setHotelSuggestions((prev) => ({ ...prev, [dayIndex]: [] }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Convert feeFormula.json to a nested map
  const feeFormulaMap = feeFormula.reduce((map, entry) => {
    if (!map[entry.from]) {
      map[entry.from] = {};
    }
    map[entry.from][entry.to] = {
      description: entry.description,
      formula: entry.formula,
      hotelLocation: entry.hotelLocation,
    };
    return map;
  }, {});

  // Debug state changes
  useEffect(() => {
    console.log("formData:", formData);
    console.log("hotelQueries:", hotelQueries);
    console.log("hotelSuggestions:", hotelSuggestions);
    console.log("selectedHotels:", selectedHotels);
    console.log("dayHotelInfo:", dayHotelInfo);
    console.log("allHotels:", allHotels);
  }, [
    formData,
    hotelQueries,
    hotelSuggestions,
    selectedHotels,
    dayHotelInfo,
    allHotels,
  ]);

  // Sync itinerary with duration
  useEffect(() => {
    const duration = parseInt(formData.duration) || 1;
    const currentLength = formData.itinerary.length;

    if (currentLength !== duration) {
      let newItinerary = [...formData.itinerary];
      if (currentLength < duration) {
        const newDays = Array.from(
          { length: duration - currentLength },
          (_, i) => ({
            day: currentLength + i + 1,
            from: "",
            to: "",
            hotelLocation: "",
          })
        );
        newItinerary = [...newItinerary, ...newDays];
      } else {
        newItinerary = newItinerary.slice(0, duration).map((item, i) => ({
          ...item,
          day: i + 1,
        }));
      }
      setFormData({ ...formData, itinerary: newItinerary });
      setHotelSuggestions((prev) => {
        const newSuggestions = {};
        newItinerary.forEach((_, index) => {
          newSuggestions[index] = prev[index] || [];
        });
        return newSuggestions;
      });
      setSelectedHotels((prev) => {
        const newSelected = {};
        newItinerary.forEach((_, index) => {
          newSelected[index] = prev[index] || null;
        });
        return newSelected;
      });
    }
  }, [formData.duration]);

  // Fetch hotel prices for a specific day (non-manual mode)
  const displayHotels = async (dayIndex) => {
    const day = formData.itinerary[dayIndex];
    const kidsAges = Array(kids).fill(5);
    const baseDate = formData.departureDate
      ? new Date(formData.departureDate)
      : null;

    if (!baseDate || !isValid(baseDate)) {
      console.error(
        `Invalid departure date for Day ${day.day}:`,
        formData.departureDate
      );
      setError(
        `Invalid departure date for Day ${day.day}. Please select a valid date.`
      );
      setDayHotelInfo((prev) => {
        const newInfo = { ...prev };
        delete newInfo[day.day];
        return newInfo;
      });
      return;
    }

    const targetDate = addDays(baseDate, dayIndex);
    const formattedDate = format(targetDate, "dd/MM/yyyy");
    const location = day.hotelLocation; // Use full location name

    if (
      !adults ||
      !formattedDate ||
      !location ||
      location === "No accommodation needed"
    ) {
      console.log(
        `Skipping hotel fetch for Day ${day.day}: Missing fields or no accommodation needed`
      );
      setDayHotelInfo((prev) => {
        const newInfo = { ...prev };
        delete newInfo[day.day];
        return newInfo;
      });
      return;
    }

    try {
      console.log(
        `Fetching hotel for Day ${day.day}: /api/hotels/hotel-price?date=${formattedDate}&location=${location}`
      );
      const res = await axios.post(
        "https://calculator-gaql.onrender.com/api/hotels/hotel-price",
        {
          groupSizeInfo: {
            adults: { count: adults },
            kids: { age: kidsAges },
          },
        },
        {
          params: { date: formattedDate, location },
        }
      );
      const extractedHotelInfo = res.data.map(
        ({ hotel, totalPrice, class: hotelClass }) => ({
          hotel,
          totalPrice,
          hotelClass,
        })
      );
      setDayHotelInfo((prev) => ({
        ...prev,
        [day.day]: extractedHotelInfo,
      }));
      setError(null);
    } catch (err) {
      console.error(
        `Hotel API error for Day ${day.day}:`,
        err.response?.data || err.message
      );
      const fallbackFormattedDate = format(targetDate, "yyyy-MM-dd");
      if (err.response?.status === 400) {
        try {
          const res = await axios.post(
            "https://calculator-gaql.onrender.com/api/hotels/hotel-price",
            {
              groupSizeInfo: {
                adults: { count: adults },
                kids: { age: kidsAges },
              },
            },
            {
              params: { date: fallbackFormattedDate, location },
            }
          );
          const extractedHotelInfo = res.data.map(
            ({ hotel, totalPrice, class: hotelClass }) => ({
              hotel,
              totalPrice,
              hotelClass,
            })
          );
          setDayHotelInfo((prev) => ({
            ...prev,
            [day.day]: extractedHotelInfo,
          }));
          setError(null);
        } catch (fallbackErr) {
          console.error(
            `Fallback API error for Day ${day.day}:`,
            fallbackErr.response?.data || fallbackErr.message
          );
          setError(
            `Failed to fetch hotel prices for Day ${day.day}: ${fallbackErr.message}`
          );
          setDayHotelInfo((prev) => {
            const newInfo = { ...prev };
            delete newInfo[day.day];
            return newInfo;
          });
        }
      } else {
        setError(
          `Failed to fetch hotel prices for Day ${day.day}: ${err.message}`
        );
        setDayHotelInfo((prev) => {
          const newInfo = { ...prev };
          delete newInfo[day.day];
          return newInfo;
        });
      }
    }
  };

  // Trigger hotel fetch on itinerary change
  useEffect(() => {
    if (!manualHotelSearch) {
      formData.itinerary.forEach((day, index) => {
        if (index === formData.itinerary.length - 1) {
          console.log(`Skipping hotel fetch for last day (Day ${day.day})`);
          setDayHotelInfo((prev) => {
            const newInfo = { ...prev };
            delete newInfo[day.day];
            return newInfo;
          });
          return;
        }
        if (day.from && day.to && feeFormulaMap[day.from]?.[day.to]) {
          const hotelLocation = feeFormulaMap[day.from][day.to].hotelLocation;
          if (day.hotelLocation !== hotelLocation) {
            console.log(
              `Day ${day.day}: Updating hotelLocation to ${hotelLocation}`
            );
            setFormData((prev) => {
              const newItinerary = [...prev.itinerary];
              newItinerary[index] = { ...newItinerary[index], hotelLocation };
              return { ...prev, itinerary: newItinerary };
            });
          }
          if (
            hotelLocation !== "No accommodation needed" &&
            adults &&
            formData.departureDate
          ) {
            displayHotels(index);
          } else {
            setDayHotelInfo((prev) => {
              const newInfo = { ...prev };
              delete newInfo[day.day];
              return newInfo;
            });
          }
        } else {
          setDayHotelInfo((prev) => {
            const newInfo = { ...prev };
            delete newInfo[day.day];
            return newInfo;
          });
        }
      });
    } else {
      // Fetch all hotels when hotelLocation changes
      formData.itinerary.forEach((day, index) => {
        if (index !== formData.itinerary.length - 1 && day.hotelLocation) {
          fetchAllHotels(day.hotelLocation, index);
        }
      });
    }
  }, [
    formData.adults,
    formData.children,
    formData.departureDate,
    formData.itinerary,
    manualHotelSearch,
  ]);

  const handleCalculate = async () => {
    try {
      const kidsAges = Array(kids).fill(5);
      console.log("Calculating fees with:", { adults, kids, kidsAges });

      const feeResponses = await Promise.all(
        formData.itinerary.map(({ from, to }) =>
          axios
            .get(
              "https://calculator-gaql.onrender.com/api/park/calculate-fee",
              {
                params: { from, to, adults, kids },
              }
            )
            .then((res) => {
              console.log(`API response for ${from} to ${to}:`, res.data);
              return res;
            })
            .catch((error) => {
              console.error(
                `API request failed for ${from} to ${to}:`,
                error.response?.data || error.message
              );
              throw error;
            })
        )
      );

      const processedFees = feeResponses.map((res, index) => {
        const { from, to } = formData.itinerary[index];
        if (res.data.fee === undefined || isNaN(res.data.fee)) {
          console.warn(`Invalid fee for ${from} to ${to}:`, res.data);
          const formulaData = feeFormulaMap[from]?.[to];
          if (formulaData) {
            const serviceCodes = (
              formulaData.formula.match(/[A-Z][A-Z0-9]*/g) || []
            ).filter((code) => !/^\d+$/.test(code));
            console.log("Extracted service codes:", serviceCodes);

            const vars = {
              adults: parseInt(adults) || 0,
              kids: parseInt(kids) || 0,
              ...serviceCodes.reduce((map, code) => {
                map[code] = feeConfig[code] || 0;
                return map;
              }, {}),
            };

            let formula = formulaData.formula;
            serviceCodes.forEach((code) => {
              formula = formula.replace(
                new RegExp(`\\b${code}\\b`, "g"),
                vars[code] || 0
              );
            });
            formula = formula
              .replace(/\badults\b/g, vars.adults)
              .replace(/\bkids\b/g, vars.kids);

            console.log("Evaluated formula with fallback:", formula);
            let fee;
            try {
              fee = eval(formula);
            } catch (evalError) {
              console.error(`Eval error for ${from} to ${to}:`, evalError);
              fee = 0;
            }
            return { ...res.data, fee: isNaN(fee) ? 0 : fee };
          }
          return { ...res.data, fee: 0 };
        }
        return res.data;
      });

      const feeTotal = processedFees.reduce((sum, res) => sum + res.fee, 0);

      let classPrices = [];
      if (manualHotelSearch) {
        const hotelTotal = formData.itinerary.reduce((sum, day, index) => {
          if (index === formData.itinerary.length - 1) return sum;
          const selectedHotel = selectedHotels[index];
          return sum + (selectedHotel ? selectedHotel.totalPrice : 0);
        }, 0);
        const hotelsByDay = formData.itinerary.reduce((acc, day, index) => {
          if (index === formData.itinerary.length - 1) return acc;
          const selectedHotel = selectedHotels[index];
          if (
            selectedHotel &&
            day.hotelLocation !== "No accommodation needed"
          ) {
            acc[day.day] = selectedHotel.name;
          }
          return acc;
        }, {});
        classPrices = [
          {
            hotelClass: "Selected Hotels",
            hotelTotal,
            total: feeTotal + hotelTotal,
            feeTotal,
            hotelsByDay,
          },
        ];
      } else {
        const allHotels = Object.values(dayHotelInfo).flat();
        const uniqueClasses = [
          ...new Set(
            allHotels
              .filter((hotel) =>
                formData.itinerary.some((day) =>
                  dayHotelInfo[day.day]?.some(
                    (h) =>
                      h.hotel === hotel.hotel &&
                      h.hotelClass === hotel.hotelClass
                  )
                )
              )
              .map((hotel) => hotel.hotelClass)
              .slice(0, 6) // Ensure exactly 6 classes
          ),
        ];
        console.log("Unique Classes:", uniqueClasses); // Debug log
        classPrices = uniqueClasses.map((hotelClass) => {
          const hotelTotal = formData.itinerary.reduce((sum, day, index) => {
            if (index === formData.itinerary.length - 1) return sum;
            const hotelsForDay = dayHotelInfo[day.day] || [];
            const classHotel = hotelsForDay.find(
              (h) => h.hotelClass === hotelClass
            );
            return sum + (classHotel ? classHotel.totalPrice : 0);
          }, 0);
          const hotelsByDay = formData.itinerary
            .filter((_, index) => index < formData.itinerary.length - 1)
            .reduce((acc, day, index) => {
              const hotelsForDay = dayHotelInfo[day.day] || [];
              const classHotel = hotelsForDay.find(
                (h) => h.hotelClass === hotelClass
              );
              if (
                classHotel &&
                day.hotelLocation !== "No accommodation needed"
              ) {
                acc[day.day] = classHotel.hotel;
              }
              return acc;
            }, {});
          return {
            hotelClass,
            hotelTotal,
            total: feeTotal + hotelTotal,
            feeTotal,
            hotelsByDay,
          };
        });
      }

      const duration = parseInt(formData.duration) || 1;
      const miscCost = (70 + 10 + 1 * duration) * (adults + kids) + 10;
      classPrices = classPrices.map((price) => ({
        ...price,
        total: (price.total + miscCost) / 0.88,
        miscCost,
      }));

      const details = processedFees.map((res, index) => ({
        ...res,
        hotelLocation: formData.itinerary[index].hotelLocation,
      }));

      setResults({ classPrices, details });
      console.log("Final results:", { classPrices, details });
    } catch (error) {
      console.error("API error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config?.params,
      });
      setError(
        "Failed to calculate price. Please check your inputs or ensure the backend is running."
      );
    }
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, departureDate: date });
    setDayHotelInfo({});
  };

  // Your provided locationMap
  const locationMap = {
    AR: [
      "LM",
      "CS",
      "FCS",
      "FNS",
      "TA",
      "LE",
      "ND",
      "MS",
      "ARK",
      "JRO",
      "NG",
      "LN",
      "ZNZ",
      "ACT",
      "ARP",
      "MCT",
      "SW",
      "DAR",
      "NBOR",
      "NBOF",
      "KRA",
      "WS",
      "AR",
    ],
    ARK: [
      "LMCS",
      "FCS",
      "FNS",
      "TA",
      "LE",
      "ND",
      "MS",
      "AR",
      "JRO",
      "NG",
      "LN",
      "FZNZ",
      "ACT",
      "ARP",
      "MCT",
      "SW",
      "FDAR",
      "NBOR",
      "NBOF",
      "KRA",
      "WS",
    ],
    JRO: [
      "LM",
      "CS",
      "FCS",
      "FNS",
      "TA",
      "LE",
      "ND",
      "MS",
      "ARK",
      "AR",
      "NG",
      "LN",
      "ZNZ",
      "ACT",
      "ARP",
      "MCT",
      "SW",
      "DAR",
      "NBOR",
      "NBOF",
      "KRA",
      "WS",
    ],
    ARP: [
      "LM",
      "CS",
      "FCS",
      "FNS",
      "TA",
      "LE",
      "ND",
      "MS",
      "ARK",
      "JRO",
      "NG",
      "LN",
      "ZNZ",
      "ACT",
      "ARP",
      "MCT",
      "SW",
      "DAR",
      "NBOR",
      "NBOF",
      "KRA",
      "WS",
    ],
    LM: [
      "NG",
      "CS",
      "ARK",
      "JRO",
      "LE",
      "TA",
      "LN",
      "MS",
      "LM",
      "NS",
      "ACT",
      "ARP",
      "MCT",
      "WS",
    ],
    NG: [
      "TA",
      "ARK",
      "JRO",
      "LE",
      "LN",
      "CS",
      "NS",
      "LM",
      "NG",
      "ARP",
      "MS",
      "ACT",
      "MCT",
      "ND",
      "WS",
    ],
    TA: [
      "NG",
      "CS",
      "ARK",
      "JRO",
      "TA",
      "LE",
      "LM",
      "ND",
      "LN",
      "ARP",
      "MS",
      "ACT",
      "MCT",
      "WS",
    ],
    CS: [
      "NG",
      "CS",
      "NS",
      "MM",
      "TA",
      "LN",
      "LM",
      "LE",
      "FZNZ",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "FARK",
      "FZNZ",
      "ACT",
      "FDAR",
      "FNBO",
      "WS",
    ],
    NS: ["NS", "CS", "NG", "TA", "LM", "MM", "FNBO", "FZNZ", "FARK", "FDAR"],
    ND: ["CS", "ND", "NG", "TA", "LM", "ARK", "JRO", "MS", "LE", "LN", "ARP"],
    LE: [
      "LM",
      "NG",
      "TA",
      "ARK",
      "JRO",
      "CS",
      "ND",
      "LE",
      "MS",
      "LN",
      "WS",
      "ARP",
    ],
    LZ: ["ND", "TA", "LM", "NG", "LE", "ARP", "CS", "ARK", "JRO", "MS", "WS"],
    ZNZ: [
      "ARK",
      "FCS",
      "FNS",
      "FNBO",
      "ZNZT",
      "ZNZ",
      "FDAR",
      "LM",
      "CS",
      "TA",
      "LE",
      "ND",
      "MS",
      "NG",
      "LN",
      "ACT",
      "ARP",
      "MCT",
      "SW",
      "KRA",
      "WS",
    ],
    KR: [
      "ARK",
      "JRO",
      "MS",
      "ARP",
      "TA",
      "LM",
      "NG",
      "LE",
      "LN",
      "CS",
      "NS",
      "ND",
      "FZNZ",
      "WS",
      "KRA",
    ],
    WS: ["NG", "CS", "WS", "TA", "LM", "LE", "ARP", "MS", "ARK", "JRO", "ACT"],
    MS: [
      "MSCT",
      "ARK",
      "JRO",
      "ARP",
      "AR",
      "TA",
      "LM",
      "CS",
      "NG",
      "KR",
      "LE",
      "LN",
      "ND",
      "MSKDT",
    ],
    DAR: [
      "FZN",
      "FCS",
      "FNS",
      "FARK",
      "LM",
      "CS",
      "TA",
      "LE",
      "ND",
      "MS",
      "NG",
      "LN",
      "ACT",
      "ARP",
      "MCT",
      "SW",
      "KRA",
      "WS",
    ],
  };

  const startLocations = Object.keys(locationMap);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white bg-fixed p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent">
            Safari Pricing Tool
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Plan your African adventure with our comprehensive pricing
            calculator. Get instant quotes for your safari experience.
          </p>
        </div>

        <div className="bg-white bg-opacity-95 border-2 border-sky-500 shadow-xl rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-6 w-6 text-sky-500" />
            <h2 className="text-2xl font-bold text-sky-600">Trip Details</h2>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4 text-sky-500" />
                  Client Name
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="Enter client name"
                  className="w-full h-12 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4 text-sky-500" />
                  Client ID
                </label>
                <input
                  type="text"
                  name="clientId"
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({ ...formData, clientId: e.target.value })
                  }
                  placeholder="Enter client ID"
                  className="w-full h-12 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Calendar className="h-4 w-4 text-sky-500" />
                  Departure Date
                </label>
                <DatePicker
                  selected={formData.departureDate}
                  onChange={handleDateChange}
                  placeholderText="Pick a date"
                  dateFormat="dd-MM-yyyy"
                  className="w-full h-12 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4 text-sky-500" />
                  Adults
                </label>
                <input
                  type="number"
                  name="adults"
                  value={formData.adults}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      adults: value === "" ? "" : parseInt(value) || "",
                    });
                  }}
                  placeholder="Number of adults"
                  min="0"
                  className="w-full h-12 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4 text-sky-500" />
                  Children
                </label>
                <input
                  type="number"
                  name="children"
                  value={formData.children}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      children: value === "" ? "" : parseInt(value) || "",
                    });
                  }}
                  placeholder="Number of children"
                  min="0"
                  className="w-full h-12 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-w-xs">
              <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4 text-sky-500" />
                Duration (Days)
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    duration: value === "" ? "" : parseInt(value) || "",
                  });
                }}
                placeholder="Enter number of days"
                min="1"
                className="w-full h-12 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-sky-600">
                  <MapPin className="h-5 w-5 text-sky-500" />
                  Daily Itinerary
                </h3>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  Manual Hotel Search
                  <input
                    type="checkbox"
                    checked={manualHotelSearch}
                    onChange={(e) => {
                      setManualHotelSearch(e.target.checked);
                      if (!e.target.checked) {
                        setHotelQueries({});
                        setHotelSuggestions({});
                        setSelectedHotels({});
                      }
                    }}
                    className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-gray-300 rounded"
                  />
                </label>
              </div>
              {formData.itinerary.map((day, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-md p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="font-medium text-sky-600">
                      Day {day.day}
                    </div>
                    <div className="col-span-2 flex flex-col md:flex-row gap-4">
                      <div className="space-y-1 flex-1">
                        <label className="text-xs text-gray-500">From</label>
                        <select
                          value={day.from}
                          onChange={(e) => {
                            const newItinerary = [...formData.itinerary];
                            newItinerary[index] = {
                              ...newItinerary[index],
                              from: e.target.value,
                              to: "",
                              hotelLocation: "",
                            };
                            setFormData({
                              ...formData,
                              itinerary: newItinerary,
                            });
                            setHotelQueries((prev) => ({
                              ...prev,
                              [index]: "",
                            }));
                            setHotelSuggestions((prev) => ({
                              ...prev,
                              [index]: [],
                            }));
                            setSelectedHotels((prev) => ({
                              ...prev,
                              [index]: null,
                            }));
                          }}
                          className="w-full h-10 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">Select start location</option>
                          {startLocations.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 flex-1">
                        <label className="text-xs text-gray-500">To</label>
                        <select
                          value={day.to}
                          onChange={(e) => {
                            const newItinerary = [...formData.itinerary];
                            const toValue = e.target.value;
                            const hotelLocation =
                              feeFormulaMap[day.from]?.[toValue]
                                ?.hotelLocation || "";
                            console.log(
                              `Day ${day.day}: Setting to=${toValue}, hotelLocation=${hotelLocation}`
                            );
                            newItinerary[index] = {
                              ...newItinerary[index],
                              to: toValue,
                              hotelLocation,
                            };
                            setFormData({
                              ...formData,
                              itinerary: newItinerary,
                            });
                            setHotelQueries((prev) => ({
                              ...prev,
                              [index]: "",
                            }));
                            setHotelSuggestions((prev) => ({
                              ...prev,
                              [index]: [],
                            }));
                            setSelectedHotels((prev) => ({
                              ...prev,
                              [index]: null,
                            }));
                            if (
                              manualHotelSearch &&
                              hotelLocation &&
                              hotelLocation !== "No accommodation needed"
                            ) {
                              console.log(
                                `Fetching hotels for Day ${day.day} with hotelLocation=${hotelLocation}`
                              );
                              fetchAllHotels(hotelLocation, index);
                            }
                          }}
                          disabled={!day.from}
                          className="w-full h-10 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="">Select destination</option>
                          {day.from &&
                            locationMap[day.from]?.map((loc, locIndex) => (
                              <option key={`${loc}-${locIndex}`} value={loc}>
                                {loc}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  {index !== formData.itinerary.length - 1 &&
                    manualHotelSearch && (
                      <div
                        className="mt-4 relative"
                        ref={(el) => (dropdownRefs.current[index] = el)}
                      >
                        <input
                          type="text"
                          value={hotelQueries[index] || ""}
                          onChange={(e) => handleHotelQuery(e, index)}
                          placeholder={
                            day.hotelLocation &&
                            day.hotelLocation !== "No accommodation needed"
                              ? `Search hotels in ${day.hotelLocation}`
                              : "Select a location to search hotels"
                          }
                          disabled={
                            !day.hotelLocation ||
                            day.hotelLocation === "No accommodation needed"
                          }
                          className="w-full h-10 border border-gray-300 rounded-md px-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        {hotelSuggestions[index]?.length > 0 && (
                          <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 max-h-40 overflow-y-auto shadow-md">
                            {hotelSuggestions[index].map(
                              (hotel, suggestionIndex) => (
                                <li
                                  key={suggestionIndex}
                                  onClick={() =>
                                    handleHotelSelect(hotel, index)
                                  }
                                  className="px-3 py-2 text-sm text-gray-900 hover:bg-sky-100 cursor-pointer"
                                >
                                  {hotel.name} (Class {hotel.class}, $
                                  {hotel.totalPrice.toLocaleString()})
                                </li>
                              )
                            )}
                          </ul>
                        )}
                        {selectedHotels[index] && (
                          <div className="mt-4">
                            <div className="font-semibold text-sky-600 mb-2">
                              Selected Hotel for Day {day.day}:
                            </div>
                            <div className="card bg-gray-50 border border-gray-200 shadow-md p-4">
                              <h4 className="text-sm font-semibold text-sky-600">
                                {selectedHotels[index].name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Class: {selectedHotels[index].class}
                              </p>
                              <p className="text-sm text-gray-600">
                                Price: $
                                {selectedHotels[
                                  index
                                ].totalPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  {index !== formData.itinerary.length - 1 &&
                    !manualHotelSearch &&
                    dayHotelInfo[day.day]?.length > 0 && (
                      <div className="mt-4">
                        <div className="font-semibold text-sky-600 mb-2">
                          Suggested Hotels for {day.hotelLocation}:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {dayHotelInfo[day.day].map(
                            ({ hotel, totalPrice, hotelClass }, cardIndex) => (
                              <div
                                key={`${day.day}-${cardIndex}`}
                                className="card bg-gray-50 border border-gray-200 shadow-md"
                              >
                                <div className="card-body p-4">
                                  <h4 className="card-title text-sm font-semibold text-sky-600">
                                    {hotel}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Class: {hotelClass}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Price: ${totalPrice.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  {index !== formData.itinerary.length - 1 &&
                    day.hotelLocation === "No accommodation needed" && (
                      <div className="mt-4 text-sm text-gray-600">
                        No accommodation needed for this day.
                      </div>
                    )}
                </div>
              ))}
            </div>

            <button
              className="w-full h-12 bg-gradient-to-r from-sky-600 to-sky-400 text-white font-semibold text-lg rounded-md cursor-pointer hover:bg-sky-700"
              onClick={handleCalculate}
            >
              Calculate Safari Price
            </button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </div>
        </div>

        <div className="bg-white bg-opacity-95 border-2 border-sky-500 shadow-xl rounded-lg p-6">
          <h2 className="text-2xl font-bold text-center text-sky-600 mb-6">
            Your Safari Quote
          </h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sky-600 mb-3">Trip Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Client Name: </span>
                  <span className="text-sky-600">
                    {formData.clientName || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Client ID: </span>
                  <span className="text-sky-600">
                    {formData.clientId || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Departure: </span>
                  <span className="text-sky-600">
                    {formData.departureDate
                      ? formData.departureDate.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "Not selected"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Duration: </span>
                  <span className="text-sky-600">
                    {formData.duration || "0"} days
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Adults: </span>
                  <span className="text-sky-600">
                    {" "}
                    {formData.adults || "0"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Children: </span>
                  <span className="text-sky-600">
                    {formData.children || "0"}
                  </span>
                </div>
              </div>
              {results && results.details && (
                <div className="mt-4">
                  <h5 className="text-sm font-semibold text-sky-600">
                    Itinerary
                  </h5>
                  {results.details.map((detail, index) => (
                    <div key={index} className="text-sm text-gray-600 mb-2">
                      <div>
                        Day {index + 1} ({detail.from} → {detail.to}): $
                        {detail.fee.toLocaleString()} - {detail.description}
                      </div>
                      {detail.hotelLocation && (
                        <div>Hotel Location: {detail.hotelLocation}</div>
                      )}
                      {index !== formData.itinerary.length - 1 &&
                        detail.hotelLocation === "No accommodation needed" && (
                          <div>No accommodation needed for this day.</div>
                        )}
                      {selectedHotels[index] && (
                        <div>
                          Selected Hotel: {selectedHotels[index].name} (Class{" "}
                          {selectedHotels[index].class}, $
                          {selectedHotels[index].totalPrice.toLocaleString()})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {results && results.classPrices && (
              <div className="space-y-4">
                <h4 className="font-semibold text-sky-600">
                  {manualHotelSearch
                    ? "Selected Hotels Price"
                    : "Price by Hotel Class"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {results.classPrices.map(
                    (
                      {
                        hotelClass,
                        total,
                        feeTotal,
                        hotelTotal,
                        hotelsByDay,
                        miscCost,
                      },
                      index
                    ) => (
                      <div key={index} className="p-4 bg-sky-50 rounded-lg">
                        <div className="text-lg font-semibold text-sky-600">
                          {manualHotelSearch
                            ? "Selected Hotels"
                            : `Class ${hotelClass} Price`}
                        </div>
                        <div className="text-2xl font-bold text-sky-600">
                          ${total.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {console.log(
                            "FeeTotal",
                            feeTotal + hotelTotal + miscCost
                          )}
                          Park Fees: ${feeTotal.toLocaleString()} + Hotels: $
                          {hotelTotal.toLocaleString()} + Misc: $
                          {miscCost.toLocaleString()}
                        </div>
                        {Object.keys(hotelsByDay).length > 0 && (
                          <div className="text-sm text-gray-600 mt-2">
                            Hotels:
                            <ul className="list-disc ml-4">
                              {Object.entries(hotelsByDay).map(
                                ([day, hotelName]) => (
                                  <li key={day}>
                                    Day {day}: {hotelName}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                        {/* New cost breakdown */}
                        {adults > 0 && (
                          <div className="mt-4">
                            <div className="">
                              <span className="text-sm text-gray-600 mr-2">
                                Cost per Adult:
                              </span>

                              <span className="text-lg text-sky-600 font-semibold">
                                $
                                {(
                                  total /
                                  (adults + (kids > 0 ? kids / 2 : 0))
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            {kids > 0 && (
                              <div className="">
                                <span className="text-sm text-gray-600 mr-2">
                                  Cost per Child:
                                </span>
                                <span className="text-lg text-sky-600 font-semibold">
                                  $
                                  {(
                                    total /
                                    (adults + (kids > 0 ? kids / 2 : 0)) /
                                    2
                                  ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <button
                className="flex-1 h-12 border border-sky-500 text-sky-600 font-semibold rounded-md opacity-50 cursor-not-allowed"
                disabled
              >
                Save Quote
              </button>
              <button
                className="flex-1 h-12 bg-gradient-to-r from-sky-600 to-sky-400 text-white font-semibold rounded-md opacity-50 cursor-not-allowed"
                disabled
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
