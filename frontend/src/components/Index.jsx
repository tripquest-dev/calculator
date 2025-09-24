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
    const location = day.hotelLocation;

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
      // Directly use the response data as it contains one entry per class
      setDayHotelInfo((prev) => ({
        ...prev,
        [day.day]: res.data,
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
          setDayHotelInfo((prev) => ({
            ...prev,
            [day.day]: res.data,
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
                    (h) => h.hotel === hotel.hotel && h.class === hotel.class
                  )
                )
              )
              .map((hotel) => hotel.class)
              .slice(0, 6)
          ),
        ];
        classPrices = uniqueClasses.map((hotelClass) => {
          const hotelTotal = formData.itinerary.reduce((sum, day, index) => {
            if (index === formData.itinerary.length - 1) return sum;
            const hotelsForDay = dayHotelInfo[day.day] || [];
            const classHotel = hotelsForDay.find((h) => h.class === hotelClass);
            return sum + (classHotel ? classHotel.totalPrice : 0);
          }, 0);
          const hotelsByDay = formData.itinerary
            .filter((_, index) => index < formData.itinerary.length - 1)
            .reduce((acc, day, index) => {
              const hotelsForDay = dayHotelInfo[day.day] || [];
              const classHotel = hotelsForDay.find(
                (h) => h.class === hotelClass
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
    NS: [
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
      "MCT",
      "WS",
    ],
    LE: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "ND",
      "WS",
    ],
    LN: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "ND",
      "WS",
    ],
    ND: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "ND",
      "WS",
    ],
    MS: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "WS",
    ],
    WS: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "WS",
    ],
    ZNZ: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "WS",
      "DAR",
    ],
    DAR: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "WS",
      "ZNZ",
    ],
    ACT: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "WS",
    ],
    MCT: [
      "NG",
      "CS",
      "NS",
      "TA",
      "LN",
      "LM",
      "LE",
      "ARP",
      "MS",
      "ARK",
      "JRO",
      "ACT",
      "MCT",
      "WS",
    ],
  };

  // Fee configuration (example, adjust as per your backend)
  const feeConfig = {
    // Add your fee codes and values here if needed
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-sky-700">
        Safari Pricing Tool
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client Name
          </label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) =>
              setFormData({ ...formData, clientName: e.target.value })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter client name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client ID
          </label>
          <input
            type="text"
            value={formData.clientId}
            onChange={(e) =>
              setFormData({ ...formData, clientId: e.target.value })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter client ID"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Departure Date <Calendar className="inline ml-1 h-4 w-4" />
          </label>
          <DatePicker
            selected={formData.departureDate}
            onChange={handleDateChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholderText="Select date"
            dateFormat="dd/MM/yyyy"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Number of Adults <Users className="inline ml-1 h-4 w-4" />
          </label>
          <input
            type="number"
            value={formData.adults}
            onChange={(e) =>
              setFormData({ ...formData, adults: e.target.value })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter number of adults"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Number of Children <Users className="inline ml-1 h-4 w-4" />
          </label>
          <input
            type="number"
            value={formData.children}
            onChange={(e) =>
              setFormData({ ...formData, children: e.target.value })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter number of children"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Duration (Days) <Clock className="inline ml-1 h-4 w-4" />
          </label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            placeholder="Enter duration"
            min="1"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Itinerary
        </label>
        {formData.itinerary.map((day, index) => (
          <div
            key={day.day}
            className="border border-gray-200 p-4 mb-2 rounded-md"
          >
            <h3 className="text-lg font-semibold text-sky-600">
              Day {day.day}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div>
                <label className="block text-sm text-gray-700">From</label>
                <select
                  value={day.from}
                  onChange={(e) => {
                    const newItinerary = [...formData.itinerary];
                    newItinerary[index] = {
                      ...newItinerary[index],
                      from: e.target.value,
                    };
                    setFormData({ ...formData, itinerary: newItinerary });
                  }}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select location</option>
                  {Object.keys(locationMap).map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">To</label>
                <select
                  value={day.to}
                  onChange={(e) => {
                    const newItinerary = [...formData.itinerary];
                    newItinerary[index] = {
                      ...newItinerary[index],
                      to: e.target.value,
                    };
                    setFormData({ ...formData, itinerary: newItinerary });
                  }}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select location</option>
                  {day.from &&
                    locationMap[day.from].map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700">
                  Hotel Location <MapPin className="inline ml-1 h-4 w-4" />
                </label>
                <input
                  type="text"
                  value={day.hotelLocation}
                  onChange={(e) => {
                    const newItinerary = [...formData.itinerary];
                    newItinerary[index] = {
                      ...newItinerary[index],
                      hotelLocation: e.target.value,
                    };
                    setFormData({ ...formData, itinerary: newItinerary });
                  }}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter hotel location"
                  disabled={manualHotelSearch}
                />
                {manualHotelSearch && (
                  <div ref={(el) => (dropdownRefs.current[index] = el)}>
                    <input
                      type="text"
                      value={hotelQueries[index] || ""}
                      onChange={(e) => handleHotelQuery(e, index)}
                      className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                      placeholder="Search hotels..."
                    />
                    {hotelSuggestions[index]?.length > 0 && (
                      <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 w-full max-h-40 overflow-y-auto">
                        {hotelSuggestions[index].map((hotel) => (
                          <li
                            key={hotel.name}
                            onClick={() => handleHotelSelect(hotel, index)}
                            className="p-2 cursor-pointer hover:bg-gray-100"
                          >
                            {hotel.name} (${hotel.totalPrice})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {!manualHotelSearch &&
                  index !== formData.itinerary.length - 1 &&
                  dayHotelInfo[day.day]?.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold text-sky-600 mb-2">
                        Suggested Hotels for {day.hotelLocation}:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {dayHotelInfo[day.day].map((hotel, classIndex) => (
                          <div
                            key={`${day.day}-${classIndex}`}
                            className="card bg-gray-50 border border-gray-200 shadow-md"
                          >
                            <div className="card-body p-4">
                              <h4 className="card-title text-sm font-semibold text-sky-600">
                                {hotel.hotel}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Class: {hotel.class}
                              </p>
                              <p className="text-sm text-gray-600">
                                Price: ${hotel.totalPrice.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={manualHotelSearch}
            onChange={(e) => {
              setManualHotelSearch(e.target.checked);
              setDayHotelInfo({});
              setSelectedHotels({});
              setHotelQueries({});
              setHotelSuggestions({});
            }}
            className="form-checkbox h-5 w-5 text-sky-600"
          />
          <span className="ml-2 text-sm text-gray-700">
            Manual Hotel Search
          </span>
        </label>
      </div>

      <button
        onClick={handleCalculate}
        className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"
      >
        <Calculator className="mr-2 h-5 w-5" />
        Calculate Price
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {results && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold text-sky-700 mb-2">
            Pricing Results
          </h3>
          {results.classPrices.map((price, index) => (
            <div
              key={index}
              className="border border-gray-200 p-4 mb-2 rounded-md"
            >
              <h4 className="text-lg font-medium text-sky-600">
                Class {price.hotelClass}
              </h4>
              <p>Fee Total: ${price.feeTotal.toLocaleString()}</p>
              <p>Hotel Total: ${price.hotelTotal.toLocaleString()}</p>
              <p>Misc Cost: ${price.miscCost.toLocaleString()}</p>
              <p>Total Price (incl. VAT): ${price.total.toLocaleString()}</p>
              <h5 className="mt-2 text-sm font-medium">Hotels by Day:</h5>
              <ul>
                {Object.entries(price.hotelsByDay).map(([day, hotel]) => (
                  <li key={day}>
                    Day {day}: {hotel}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <h4 className="text-lg font-medium text-sky-600 mt-4">Fee Details</h4>
          {results.details.map((detail, index) => (
            <div
              key={index}
              className="border border-gray-200 p-4 mb-2 rounded-md"
            >
              <p>
                From: {detail.from} to {detail.to}
              </p>
              <p>Fee: ${detail.fee.toLocaleString()}</p>
              <p>Hotel Location: {detail.hotelLocation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
