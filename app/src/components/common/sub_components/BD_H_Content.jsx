import { Button } from "@/components/ui/button";
import {
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/utils/firebase.config";
import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useReducer, useState } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import useToastHook from "@/hooks/useToastHook";
import { getDatabase, push, ref, set, update } from "firebase/database";
import useProfileHook from "@/hooks/useProfileHook";
import { useAuth } from "@/context/AuthContext";
import ModalInstance from "../ModalInstance";

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      if (action.classification == "Academic") {
        return {
          ...state,
          services_title: [...state.services_title, ""],
          services: [...state.services, ""],
          floor_located: [...state.floor_located, ""],
          // head: [...state.head, ""],
          // email: [...state.email, ""],
          // contact: [...state.contact, ""],
        };
      }

      if (action.classification == "Academic Support") {
        return {
          ...state,
          services_title: [...state.services_title, ""],
          services: [...state.services, ""],
          head: [...state.head, ""],
          email: [...state.email, ""],
          contact: [...state.contact, ""],
          floor_located: [...state.floor_located, ""],
        };
      }
    }

    case "discard": {
      return {
        ...state,
        services_title: [...state.services_title].slice(0, -1),
        services: [...state.services].slice(0, -1),
        head: [...state.head].slice(0, -1),
        email: [...state.email].slice(0, -1),
        contact: [...state.contact].slice(0, -1),
        floor_located: [...state.floor_located].slice(0, -1),
      };
    }

    case "delete": {
      return {
        ...state,
        services_title: [
          ...state.services_title.slice(0, action.index),
          ...state.services_title.slice(action.index + 1),
        ],
        services: [
          ...state.services.slice(0, action.index),
          ...state.services.slice(action.index + 1),
        ],
        head: [
          ...state.head.slice(0, action.index),
          ...state.head.slice(action.index + 1),
        ],
        email: [
          ...state.email.slice(0, action.index),
          ...state.email.slice(action.index + 1),
        ],
        contact: [
          ...state.contact.slice(0, action.index),
          ...state.contact.slice(action.index + 1),
        ],
        floor_located: [
          ...state.floor_located.slice(0, action.index),
          ...state.floor_located.slice(action.index + 1),
        ],
      };
    }

    case "update_value": {
      return {
        ...state,
        [action.key]: state[action.key].map((item, idx) =>
          idx === action.index ? action.value : item
        ),
      };
    }

    case "update_single": {
      return {
        ...state,
        [action.key]: action.value,
      };
    }

    case "reset": {
      return { ...action.payload };
    }

    default:
      return state;
  }
}

const BD_H_Content = ({ initstate, isOpen, udf }) => {
  const [state, dispatch] = useReducer(reducer, {});
  const { showToast } = useToastHook();
  const { state: stateProfile } = useProfileHook();
  const { setAuthLoading } = useAuth();

  const [isOpenNew, setIsOpenNew] = useState(false);
  const [details, setDetails] = useState();
  const [defaultValues, setDefaultValues] = useState();

  const [classification, setClassification] = useState("Academic Support");

  const radioOnChange = (e) => {
    setClassification(e.target.value);
  };

  useEffect(() => {
    let newpay;

    if (!initstate?.floor_located) {
      newpay = {
        ...initstate,
        floor_located: initstate.email.map((item, index) => {
          return "";
        }),
      };
    } else {
      newpay = { ...initstate };
    }

    dispatch({ type: "reset", payload: { ...newpay } });
    setClassification(newpay?.classification);
    setDefaultValues(newpay);
  }, [initstate]);

  const handleTextAreaChange = (e, index) => {
    if (e.key == "Enter") {
      const text = e.target.value;
      const textarea = e.target;
      const cursorPosition = textarea.selectionStart;

      // Insert ";" at the cursor position
      const newText =
        text.slice(0, cursorPosition) + ";\n" + text.slice(cursorPosition);

      // Update the textarea value
      e.target.value = newText;

      // Move the cursor to the correct position after ";"
      textarea.selectionEnd = cursorPosition + 2;

      // Prevent default Enter key action since we handled it manually
      e.preventDefault();

      dispatch({
        type: "update_value",
        key: e.target.id,
        index: index,
        value: newText,
      });
    }
  };

  const handleInputChange = (e, index) => {
    dispatch({
      type: "update_value",
      key: e.target.id,
      index: index,
      value: e.target.value,
    });
  };

  const handleSingleInputChange = (e) => {
    dispatch({
      type: "update_single",
      key: e.target.id,
      value: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setAuthLoading(true);
    try {
      const histodb = getDatabase();

      let path_id = initstate.id;
      let fd_payload = { ...state };
      fd_payload["classification"] = classification;
      fd_payload.services = fd_payload.services.map((item) =>
        item.replace(/;\n/g, ";_")
      );

      let b_details = [];
      fd_payload?.services_title?.map((item, index) => {
        const services = fd_payload?.services[index] || "No record";
        const head = fd_payload?.head[index] || "No record";
        const cinfo = fd_payload?.contact[index] || "No record";
        const email = fd_payload?.email[index] || "No record";
        const fl = fd_payload?.floor_located[index] || "No record";

        let newitem =
          (`**${item} ${
            classification.toLowerCase() == item.toLowerCase()
              ? ""
              : `- ${classification}`
          }**` || "No service provided") +
          "\n" +
          (`**Floor Number**: ${fl}` || "No Floor Provided") +
          "\n\n**List of Rooms**: \n- " +
          services.replace(/_/g, "\n- ") +
          "\n\n**Head/Director**: " +
          head +
          "\n\n**Contact Number**: " +
          cinfo +
          "\n\n**Email Address**: " +
          email;

        // Replace actual newline characters with literal \n
        newitem = newitem.replace(/\n/g, "\\n");

        b_details.push(newitem);
      });

      const newpayload = b_details.join("\\n\\n\\n");
      const d_dbref = ref(histodb, `buildings/info/${path_id - 1}`);
      const drecord = {
        id: fd_payload?.id,
        name: fd_payload?.name,
        service: newpayload,
      };
      await update(d_dbref, drecord);

      const nameRef = ref(
        histodb,
        `json_files/building/features/${path_id - 1}/properties`
      );
      const nameRefRecord = {
        name: fd_payload?.name,
      };
      await update(nameRef, nameRefRecord);

      // Save data to Firestore with custom ID
      await updateDoc(doc(db, "buildings_data", path_id), { ...fd_payload });
      await udf(path_id);

      const h_dbref = ref(histodb, "history");
      const hrecord = {
        user: stateProfile?.name ?? stateProfile?.email,
        message: `User: <b><u>${
          stateProfile?.name ?? stateProfile?.email
        }</b></u> has updated the <b><u>${
          initstate?.name
        } </b></u>building record.`,
        targetOfChange: `Updation of ${initstate?.name} building record.`,
        time: new Date().valueOf(),
      };
      await push(h_dbref, hrecord);

      setIsOpenNew(true);
      setDetails({
        isError: false,
        title: "Success",
        description: `Updated Successfully.`,
      });

      // showToast(
      //   "success",
      //   "Updated Successfully",
      //   `Changes were saved successfully.`,
      //   3000
      // );
      // // isOpen(false);
    } catch (error) {
      console.log(error);
      setIsOpenNew(true);
      setDetails({
        isError: false,
        title: "Attempt Unsuccessful",
        description: `Please try again.`,
      });
      // showToast(
      //   "destructive",
      //   "Attempt Unsuccessful",
      //   `Please try again.`,
      //   3000
      // );
    }

    setAuthLoading(false);
  };

  // const handleSubmit = async () => {
  //   setAuthLoading(true);
  //   try {
  //     const histodb = getDatabase();

  //     let path_id = initstate.id;
  //     let fd_payload = { ...state };
  //     fd_payload["classification"] = classification;
  //     fd_payload.services = fd_payload.services.map((item) =>
  //       item.replace(/;\n/g, ";_")
  //     );

  //     let b_details = [];
  //     fd_payload?.services_title?.map((item, index) => {
  //       const services = fd_payload?.services[index] || "No record";
  //       const head = fd_payload?.head[index] || "No record";
  //       const cinfo = fd_payload?.contact[index] || "No record";
  //       const email = fd_payload?.email[index] || "No record";
  //       const fl = fd_payload?.floor_located[index] || "No record";

  //       let newitem =
  //         (`**${item} ${
  //           classification.toLowerCase() == item.toLowerCase()
  //             ? ""
  //             : `- ${classification}`
  //         }**` || "No service provided") +
  //         "\n" +
  //         (`**Floor Number**: ${fl}` || "No Floor Provided") +
  //         "\n " +
  //         "\n\n**List of Rooms**: \n- " +
  //         services.replace(/_/g, "\n- ") +
  //         "\n\n**Head/Director**: " +
  //         head +
  //         "\n\n**Contact Number**: " +
  //         cinfo +
  //         "\n\n**Email Address**: " +
  //         email;

  //       // Replace actual newline characters with literal \n
  //       newitem = newitem.replace(/\n/g, "\\n");

  //       b_details.push(newitem);
  //     });

  //     const newpayload = b_details.join("\\n\\n\\n");
  //     const d_dbref = ref(histodb, `buildings/info/${path_id - 1}`);
  //     const drecord = {
  //       id: fd_payload?.id,
  //       name: fd_payload?.name,
  //       service: newpayload,
  //     };

  //     const nameRef = ref(
  //       histodb,
  //       `json_files/building/features/${path_id - 1}/properties`
  //     );
  //     const nameRefRecord = {
  //       name: fd_payload?.name,
  //     };

  //     const h_dbref = ref(histodb, "history");
  //     const hrecord = {
  //       user: stateProfile?.name ?? stateProfile?.email,
  //       message: `User: <b><u>${
  //         stateProfile?.name ?? stateProfile?.email
  //       }</b></u> has updated the <b><u>${
  //         initstate?.name
  //       } </b></u>building record.`,
  //       targetOfChange: `Updation of ${initstate?.name} building record.`,
  //       time: new Date().valueOf(),
  //     };

  //     setIsOpenNew(true);
  //     setDetails({
  //       isError: false,
  //       title: "Success",
  //       description: `Updated Successfully.`,
  //     });

  //     // showToast(
  //     //   "success",
  //     //   "Updated Successfully",
  //     //   `Changes were saved successfully.`,
  //     //   3000
  //     // );
  //     // // isOpen(false);
  //   } catch (error) {
  //     console.log(error);
  //     setIsOpenNew(true);
  //     setDetails({
  //       isError: false,
  //       title: "Attempt Unsuccessful",
  //       description: `Please try again.`,
  //     });
  //     // showToast(
  //     //   "destructive",
  //     //   "Attempt Unsuccessful",
  //     //   `Please try again.`,
  //     //   3000
  //     // );
  //   }

  //   setAuthLoading(false);
  // };

  const handleDiscard = () => {
    isOpen(false);
    dispatch({ type: "reset", payload: { ...defaultValues } });
  };

  const addService = () => {
    if (!classification) {
      setIsOpenNew(true);
      setDetails({
        isError: false,
        title: "Attempt Unsuccessful",
        description: `Classification is not defined.`,
      });
      // showToast(
      //   "destructive",
      //   "Attempt Unsuccessful",
      //   `Classification is not defined.`,
      //   3000
      // );
      return;
    }

    dispatch({ type: "add", classification: classification });
  };

  const deleteService = (index) => {
    dispatch({ type: "delete", index: index });
  };

  const discardChanges = (index) => {
    dispatch({ type: "reset", payload: { ...defaultValues } });
  };

  return (
    <>
      <ModalInstance
        isOpen={isOpenNew}
        details={details}
        setIsOpen={setIsOpenNew}
      />
      <DrawerContent>
        <VisuallyHidden>
          <DrawerHeader>
            <DrawerTitle>Move Goal</DrawerTitle>
            <DrawerDescription>Set your daily activity goal.</DrawerDescription>
          </DrawerHeader>
        </VisuallyHidden>

        <h3 className="mt-4 text-4xl font-semibold text-center">
          {state?.name}
        </h3>
        <div className="flex justify-center gap-2 pt-4 pb-4">
          <Button variant="Ghost" className="border" onClick={handleDiscard}>
            Discard Changes
          </Button>
          <Button
            className="bg-[#00413d] hover:bg-[#1B3409]"
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
        </div>
        <hr />
        <div className="px-8 pt-4 pb-8 h-[70dvh] overflow-y-scroll">
          <div className="w-1/3 m-auto">
            <div className="mb-4">
              <Label htmlFor="name">Building Name</Label>
              <Input
                placeholder="Enter building name"
                id="name"
                type="text"
                value={state?.name}
                onChange={handleSingleInputChange}
                disabled={false}
                autoComplete="off"
              />
            </div>

            <div className="mb-4">
              <Label>Classification</Label>
              <div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="classification"
                    id="acad"
                    value="Academic"
                    className="w-3 h-3 mr-2"
                    onChange={radioOnChange}
                    checked={classification == "Academic"}
                  />
                  <label htmlFor="acad">Academic</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="classification"
                    id="acadsupp"
                    value="Academic Support"
                    className="w-3 h-3 mr-2"
                    onChange={radioOnChange}
                    checked={
                      classification == "Academic Support" ||
                      classification == "Other Core Facilities"
                    }
                  />
                  <label htmlFor="acadsupp">Other Core Facilities</label>
                </div>

                <p className="mt-1 text-xs text-justify">
                  <b>Note:</b> If the building consist of 1 head/director,
                  choose <b>Academic</b> else <b>Other Core Facilities</b>
                </p>
              </div>
            </div>

            {state?.services_title?.map((item, index) => {
              const services_off = state?.services[index]
                .replace(/_/g, "\n")
                .replace(/- /g, "");

              return (
                <div key={index}>
                  <p className="mt-8 mb-2 font-medium text-center">{item}</p>
                  <hr />

                  <div className="mt-4 mb-2">
                    <div className="flex justify-between">
                      <Label htmlFor="services_title">
                        Core Categorization
                      </Label>
                      {index != 0 && (
                        <button
                          className="text-xs text-red-500 underline"
                          onClick={(e) => deleteService(index)}
                        >
                          - delete this service
                        </button>
                      )}
                    </div>
                    <Input
                      className="mt-1"
                      placeholder="Enter Building Categorization"
                      id="services_title"
                      type="text"
                      value={state?.services_title[index]}
                      onChange={(e) => handleInputChange(e, index)}
                      disabled={false}
                      autoComplete="off"
                    />
                  </div>

                  <div className="mb-2">
                    <Label htmlFor="services">List/s of Room/s</Label>
                    <Textarea
                      className="mt-1 resize-none"
                      placeholder="Enter list of rooms"
                      id="services"
                      type="text"
                      value={services_off}
                      onKeyPress={(e) => handleTextAreaChange(e, index)}
                      onChange={(e) => handleInputChange(e, index)}
                      rows="5"
                      disabled={false}
                      autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong>Note: </strong>Press enter to for separating each
                      services.
                    </p>
                  </div>

                  {state?.floor_located && (
                    <div className="mb-2">
                      <Label htmlFor="floor_located">Floor Located</Label>
                      <Input
                        className="mt-1"
                        placeholder="e.g. First floor - Left"
                        id="floor_located"
                        type="text"
                        value={state?.floor_located[index]}
                        onChange={(e) => handleInputChange(e, index)}
                        disabled={false}
                        autoComplete="off"
                      />
                    </div>
                  )}

                  {classification == "Academic" &&
                    index == state?.floor_located.length - 1 && (
                      <button
                        className="mb-2 text-xs text-blue-500 underline"
                        onClick={addService}
                      >
                        + add new service
                      </button>
                    )}

                  {classification == "Academic Support" && (
                    <>
                      <div className="mb-2">
                        <Label htmlFor="head">Head</Label>
                        <Input
                          className="mt-1"
                          placeholder="Enter the name of the head"
                          id="head"
                          type="text"
                          value={state?.head[index]}
                          onChange={(e) => handleInputChange(e, index)}
                          disabled={false}
                          autoComplete="off"
                        />
                      </div>

                      <div className="mb-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          className="mt-1"
                          placeholder="Enter head's email"
                          id="email"
                          type="text"
                          value={state?.email[index]}
                          onChange={(e) => handleInputChange(e, index)}
                          disabled={false}
                          autoComplete="off"
                        />
                      </div>

                      <div className="mb-2">
                        <Label htmlFor="contact">Contact Number</Label>
                        <Input
                          className="mt-1"
                          placeholder="Enter head's contact number"
                          id="contact"
                          type="text"
                          value={state?.contact[index]}
                          onChange={(e) => handleInputChange(e, index)}
                          disabled={false}
                          autoComplete="off"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {classification == "Academic Support" && (
              <button
                className="mt-4 text-xs text-blue-500 underline"
                onClick={addService}
              >
                + add new service
              </button>
            )}

            {classification == "Academic" && (
              <>
                <div className="mb-2">
                  <Label htmlFor="head">Head</Label>
                  <Input
                    className="mt-1"
                    placeholder="Enter the name of the head"
                    id="head"
                    type="text"
                    value={state?.head[0]}
                    onChange={(e) => handleInputChange(e, 0)}
                    disabled={false}
                    autoComplete="off"
                  />
                </div>

                <div className="mb-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    className="mt-1"
                    placeholder="Enter head's email"
                    id="email"
                    type="text"
                    value={state?.email[0]}
                    onChange={(e) => handleInputChange(e, 0)}
                    disabled={false}
                    autoComplete="off"
                  />
                </div>

                <div className="mb-2">
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input
                    className="mt-1"
                    placeholder="Enter head's contact number"
                    id="contact"
                    type="text"
                    value={state?.contact[0]}
                    onChange={(e) => handleInputChange(e, 0)}
                    disabled={false}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </>
  );
};

export default BD_H_Content;
