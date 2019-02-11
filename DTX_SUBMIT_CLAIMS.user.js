// ==UserScript==
// @name         DTX_SUBMIT_CLAIMS
// @namespace    http://webvpnuk.capgemini.com/
// @version      1.0
// @description  Makes the DTX Submit Claims page work in Chrome
// @author       martin.armstrong@capgemini.com
// @match        https://*/*/DTX.NET/*
// @match        https://*/DTX.NET/*
// @match        http://*/*/DTX.NET/*
// @match        http://*/DTX.NET/*
// @grant        none
// ==/UserScript==

(function(){
    'use strict';
    if(window.location.href.indexOf("SubmitClaims.aspx")==-1) {
        return;
    }

    window.onerror = (e) => {
        console.log(e);
    }

    console.log("Running DTX_SUBMIT_CLAIMS Tampermonkey script..");
    console.log("URL: "+window.location.href);

    if(typeof window.$!="function") {
      console.error("expected jquery in the page")
        return;
    }

    //try and build equivalent css element selector and post-select transform from xpath
    function xpath2ElementSelector(xpath) {
      var selector = xpath;
      if(selector.indexOf("//")==0) {
          selector = selector.replace("//", "");
      }
      var elementIndexRefs = selector.match(/\[([0-9]+)\]/) || [""];
      //transform node list index notation
      elementIndexRefs = elementIndexRefs.slice(1);
      elementIndexRefs.forEach(index=>{
          selector = selector.replace("["+index+"]", ":nth-of-type("+(Number(index)+1)+")");
      });
      selector = selector.replace(/\/@[^\/:]+/, ""); //drop attribute part if present
      selector = selector.replace(/\//gmi, " > "); //immediate child

      var transform = function(node){return node;}
      var childElementWithValueRegex = /\[([^= ]+)[ ]?='([^']+)'\]/
      var childElementNameAndValue = selector.match(childElementWithValueRegex);
      if(childElementNameAndValue!=null && childElementNameAndValue.length>1) {
          var elementName = childElementNameAndValue[1];
          var elementValue = childElementNameAndValue[2];
          selector = selector.replace(childElementWithValueRegex, " > "+elementName); //so finding all child elements with appropriate name
          transform = function(node) { //then use this transform in map function to return the parent element if element value is as expected, otherwise null
              console.log("applying node filter to get parent element if child has name: "+elementName+" and value:"+elementValue);
              if(node.innerHTML==elementValue) {
                 return node.parentNode;
             }
             return undefined;
          }
      }

      return {selector:selector, transform:transform};
    }

    //mimic IE xpath support
    console.log("Adding Element.prototype.selectSingleNode function to mimic IE xpath support..");
    Element.prototype.selectSingleNode = function(xpath){
        console.log("selectSingleNode with: "+xpath);
        var nodes = this.selectNodes(xpath);
        return nodes.length>0 ? nodes[0] : null;
    }

    //mimic IE xpath support
    console.log("Adding Element.prototype.selectNodes function to mimic IE xpath support..");
    Element.prototype.selectNodes = function(xpath){
       console.log("selectNodes with: "+xpath+" on documentElement..");
       console.log(this);
       var attNames = xpath.match(/@([^@]+)/) || [""];
       attNames = attNames.slice(1);

       var selectorObj = xpath2ElementSelector(xpath);

       console.log("selectNodes using css selector: "+selectorObj.selector);

       var foundNodes = this.querySelectorAll(selectorObj.selector);
       var nodeArray = [];
       foundNodes.forEach(function(node){ //node lists don't have a map function :(
           var newNode = selectorObj.transform(node);
           if(newNode!=null) {
               nodeArray.push(newNode);
           }
       });

       if(attNames.length>0) {
         if(nodeArray.length>0) {
           var atts = nodeArray.map(node => {
               var att = node.getAttributeNode(attNames[attNames.length-1]);
               att.text = att.value;
               return att;
            });
           console.log("selectNodes found attribute values..")
           console.log(atts)
           return atts;
         }
         else {
           console.log("selectNodes found no nodes.")
           return [];
         }
       }
       else {
         console.log("selectNodes found nodes..")
         console.log(nodeArray)
         return nodeArray;
       }
    }

    //completes script text which wierdly only partially loads in chrome
    //the DriverSurveyCheck function is also replaced with the comlpete version myDriverSurveyCheck below
    function fixScript(script) {
        console.log("Fixing broken claimSubmissionPage.js..");
        script = script + "'); } }";
        return script;
    }


    // copy of XMLListOfProjects that swaps element.text for element.innerHTML for Chrome support
    // also sets xmlProjectList.xml = xmlProjectList.documentElement.outerHTML which you get in IE
    function myXMLListOfProjects(includeItemList) {
        var xmlProjectList = parseXML( "<ProjectList/>" );
        document.getElementById("hdnCategorySurveyRequirements").value = ""; //added for CCR_1505
        // list through the project table

        var claim;
        $(getProjectsTableList()).each( function(i) {
            // looping through the projects

            selected = $(this).find("td").get(projectsColumnPositions.Selected);
            if (isSelected(selected))
            {
                claim = xmlProjectList.createElement("Claims");

                var claimID = xmlProjectList.createElement("ClaimID");
                var employeeNumber = xmlProjectList.createElement("EmployeeNumber");
                var projectCode = xmlProjectList.createElement("ProjectCode");
                var period = xmlProjectList.createElement("Period");
                var ratingCode = xmlProjectList.createElement("ComplianceRating");
                var noReceipts = xmlProjectList.createElement("NoReceipts");
                var noMissingReceipts = xmlProjectList.createElement("NoMissingReceipts");
                var claimAmount = xmlProjectList.createElement("ClaimAmount");
                var claimType = xmlProjectList.createElement("ClaimType");
                var projectKey = xmlProjectList.createElement("ProjectKey");
                var driverSurvey = xmlProjectList.createElement("DriverSurveyEmployeeSelected"); //added for CCR_1505
                var networkUser = xmlProjectList.createElement("NetworkUser"); //added for CCR_1505

                projectCode.innerHTML = $($(this).find("td").get(projectsColumnPositions.Project_Code)).text();
                ratingCode.innerHTML = $($(this).find("td").get(projectsColumnPositions.Rating)).attr('rating');
                noReceipts.innerHTML = $($(this).find("td").get(projectsColumnPositions.Receipts)).find("input").attr("value");
                noMissingReceipts.innerHTML = $($(this).find("td").get(projectsColumnPositions.No_Receipts)).find("input").attr("value");
                claimAmount.innerHTML = $($(this).find("td").get(projectsColumnPositions.Amount)).text();
                claimType.innerHTML = $($(this).find("td").get(projectsColumnPositions.ClaimType)).text();
                projectKey.innerHTML = $($(this).find("td").get(projectsColumnPositions.ProjectKey)).text();



                if  ( claimType.innerHTML == "Expenses")
                {
                    claimType.innerHTML = "NE";
                }
                else if ( claimType.innerHTML == "Payroll")
                {
                    claimType.innerHTML = "PV";
                }

                claim.appendChild( projectCode );
                claim.appendChild( employeeNumber );
                claim.appendChild( ratingCode );
                claim.appendChild( noReceipts );
                claim.appendChild( noMissingReceipts );
                claim.appendChild( claimAmount );
                claim.appendChild( claimType );
                claim.appendChild( projectKey );
                claim.appendChild( period );
                claim.appendChild( claimID );

                if ( includeItemList)
                {
                    var authoriser = xmlProjectList.createElement("Authoriser");
                    var projectManager = xmlProjectList.createElement("ProjectManager");
                    var authScrunity = xmlProjectList.createElement("AuthScrunity");

                    var authoriserCol = $(this).find("td").get(projectsColumnPositions.Authoriser);
                    var validatorCol = $(this).find("td").get(projectsColumnPositions.Validator);
                    authoriser.innerHTML = $(authoriserCol).find("select option[selected]").attr('value');
                    projectManager.innerHTML = $(validatorCol).find("select option[selected]").attr('value');


                    claim.appendChild( authoriser );
                    claim.appendChild( projectManager );

                    authScrunity.innerHTML = "N";

                    var items = xmlProjectList.createElement("ClaimItems");

                    $(getClaimItems()).each( function( i )
                    {
                        claimItem = $(this);
                        selected = $(this).find("td").get(projectsColumnPositions.ItemSelected);
                        claimProjectKey = $(this).find("td").get(claimsColumnPositions.ProjectKey);
                        if (projectKey.innerHTML == $(claimProjectKey).text() && $(selected).find("input").attr('checked'))
                        {
                            var itemNode = xmlProjectList.createElement("Item");
                            itemNode.innerHTML = $($(claimItem).find("td").get(claimsColumnPositions.Item_ID)).text();

                            items.appendChild( itemNode );
                            claim.appendChild(items);   //added for CCR_1505
                             driver_survey=$($(claimItem).find("td").get(claimsColumnPositions.DRIVER_SURVEY)).text();//added for CCR_1505
                            if(driver_survey=="Y")//added for CCR_1505
                            {
                              document.getElementById("hdnCategorySurveyRequirements").value = "Y";  //added for CCR_1505
                            }
                        }

                    });

                     claim.appendChild( authScrunity ); //added for CCR_1505
                     driverSurvey.innerHTML = DriverSurveyEmployeeSelect; //added for CCR_1505
                     claim.appendChild( driverSurvey ); //added for CCR_1505
                     networkUser.innerHTML = document.getElementById("hdnnetworkuser").value; //added for CCR_1505
                     claim.appendChild( networkUser ); //added for CCR_1505
             }
                xmlProjectList.documentElement.appendChild( claim );
            }
        });
        xmlProjectList.xml = xmlProjectList.documentElement.outerHTML;
        return xmlProjectList;
    }


    // copy of submitClaims function that swaps element.text for element.innerHTML for Chrome support
    //also simpler confirmation alert
    function mySubmitClaims()
    {

            var claimtypes=false;  //added for CCR_1323

            // gather claim information and submit it for processing.
            projectsTable = XMLListOfProjects(true);
            httpSubmissionCollection = {'op':'submitClaims' , 'xml' : escape(projectsTable.xml)};


            $.post("./AjaxHandlers/ClaimSubmissionHandler.aspx" , httpSubmissionCollection , function(data){
                // setup an xml object from the returned data.
                projectsTable = parseXML( data );


                // see if the claims requested had any errors.
                // if so then set message and redirect to the myclaims page.
                // if there are any errors then
                //      1) remove any 'claims' that were saved.
                //      2) show error message.
                var passThroughMessage = "";
                if ( projectsTable.documentElement.selectNodes("//ErrorMessage").length == 0 ) {
                    var numOfClaims = projectsTable.documentElement.selectNodes("Claims").length
                    passThroughMessage = numOfClaims==1 ? "One claim was created \r\n " : ""+numOfClaims+" claims were created \r\n ";
                    for(var i = 0 ; i < numOfClaims ; i++ ) {
                        if(projectsTable.documentElement.selectSingleNode("Claims[" + i + "]/ClaimType").innerHTML=='NE'){
                           claimtypes=true;
                        }
                        //passThroughMessage = passThroughMessage + projectsTable.documentElement.selectSingleNode("Claims[" + i + "]/ClaimID").text + "; \r\n ";
                    }
                    if(claimtypes==true) {
                        passThroughMessage = passThroughMessage + "\r\n \r\n To complete your clam and allow payment either: \r\n  ●  Print the expense claim and submit it in an Expense envelope along with supporting receipts\r\n or \r\n ●  Scan your receipts and submit them directly through DTX via the ‘My Claims’ tab.";
                    }
                    //added for CCR_1323
                    alert(passThroughMessage);
                    window.location = "MyClaims.aspx"; //passThroughMessage=" + passThroughMessage;
                }
                else {                    
                    for(var i = 0 ; i < projectsTable.documentElement.selectNodes("Claims").length ; i++ )
                    {
                        if ( projectsTable.documentElement.selectSingleNode("Claims[" + i + "]/ErrorMessage") != null)
                        {
                            passThroughMessage = passThroughMessage + projectsTable.documentElement.selectSingleNode("Claims[" + i + "]/ErrorMessage").innerHTML + " \r\n";
                        }
                    }
                    alert("There were the following errors with the claims submitted : \r\n" + passThroughMessage);
                }

            });
    }


//Complete version of DriverSurveyCheck as you get in IE but for some reason doesn't load in Chrome
function myDriverSurveyCheck()  {
             XMLListOfProjects(true);

             if ( document.getElementById("hdnCategorySurveyRequirements").value == "Y")
             {

              $('input[name="actionButtonOne"]').val("Yes");
                 $('input[name="actionButtonTwo"]').val("No");
                 //var strLink= "Before submitting a claim relating to driving your private car on company business please confirm:  \r\n ●  You have a valid UK driving licence or equivalent licence that allows you to drive in the UK  <br/><br/>";//  ●  You have business insurance in place for your private car  <br/><br/> ●  Your car has a valid MOT and is serviced in line with manufacturer guidelines"

                 var strLink= "Before submitting a claim relating to driving your private car on company business please confirm: <br/>  ●  You have a valid UK driving licence or equivalent licence that allows you to drive in the UK  <br/>   ●  You have business insurance in place for your private car  <br/>  ●  Your car has a valid MOT and is serviced in line with manufacturer guidelines"
                $("#messageLabel").html(strLink);

                // $("#messageLabel").text("DTX survey Question");

                 $('input#actionButton1').unbind("click");
                 $('input#actionButton1').bind("click", function ()
                 {
                     DriverSurveyEmployeeSelect = "Y";
                     disablePopup();

                     submitClaims();
                 });
                 //$('input[name="actionButtonTwo"]').hide();

                 // bind the No action
                 $('input[name="actionButtonTwo"]').unbind("click");
                 $('input[name="actionButtonTwo"]').bind("click", function ()
                 {
                      DriverSurveyEmployeeSelect = "N";
                     disablePopup();

                     submitClaims();
                 });
                 $('input[name="actionButtonThree"]').hide();
                 centerPopup();
                 loadPopup();
            }
            else
            {
                submitClaims();
            }
 }


//when claimSubmissionPage.js has been evaluated this replaces some of the functions with fixed/Chrome compatible ones..
    function postEvalScriptAlterations(){
       XMLListOfProjects = myXMLListOfProjects;
       DriverSurveyCheck = myDriverSurveyCheck;
       submitClaims = mySubmitClaims;
    }

    if(typeof window.documentReady=="function") {
        console.log("Running documentReady()");
        setTimeout(window.documentReady, 500);
    }
    else {
        console.log("documentReady() not found, building/running replacement script..");
        var scriptTags = document.getElementsByTagName("script");

        for(var i=0;i<scriptTags.length;i++) {
          var el = scriptTags[i];
          if(el.src.endsWith("claimSubmissionPage.js")) {
              console.log("Loading broken claimSubmissionPage.js..");
              window.$.get(el.src,
                  null,
                  (data, status, xhr) => {
                    window.eval(fixScript(data));
                    postEvalScriptAlterations();
                    window.documentReady();
                  },
                  "application/x-javascript")
          }
        }

    }

})()
