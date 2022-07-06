/**
* Author: Tyler Peryea
*
* This WIP library will help render synthetic schemes for G4SSM in GSRS via
* the cola and d3 libraries.
*/
var schemeUtil={};
schemeUtil.showApprovalID=false;
schemeUtil.approvalCode="UNII";
schemeUtil.apiBaseURL="";
schemeUtil.debug=true;
schemeUtil.width=800;
schemeUtil.height=1050;

schemeUtil.onClickReaction=(d)=>{};
schemeUtil.onClickMaterial=(d)=>{};

schemeUtil.rep = function(t, n) {
  var nn = "";
  for (var i = 0; i < n; i++) {
    nn += t;
  }
  return nn;
}
schemeUtil.maxLen =function (txt, len) {
  if (!txt) return txt;
  if (txt.length < len) return schemeUtil.rep("\xa0", (len - txt.length) / 2 - 1) + txt;
  return txt.substr(0, len - 3) + "...";
};
schemeUtil.makeMaterialNode = function(smat, pidArr){
   var nn = {};
   nn.id = pidArr[0];
   pidArr[0]++;
   if(smat.verbatimName){
    nn.bottomText=smat.verbatimName;
   }else{
    nn.bottomText = smat.substanceName.refPname;
   }
   nn.name = smat.substanceName.approvalID;
   nn.type = "material";
   nn.refuuid = smat.substanceName.refuuid;
   if(!schemeUtil.debug){
    nn.img=schemeUtil.apiBaseURL + "substances/render(" + smat.substanceName.refuuid + ")?format=svg&size=150&stereo=false";
   }
   if(schemeUtil.showApprovalID){
     if (!nn.name) {
        nn.name = schemeUtil.approvalCode + ": Pending Record";
     } else {
        nn.name = schemeUtil.approvalCode + ": " + nn.name;
     }
   }
   if ((smat.substanceRole + "").toUpperCase() === "INTERMEDIATE") {
          nn.brackets = true;
   }
   return nn;
};
schemeUtil.makeDisplayGraph = function(g4) {
  var nodes = [];
  var links = [];
  var canMap = {};
  var ppid = [0];
  for (var i = 0; i < g4.specifiedSubstanceG4m.process.length; i++) {
    var p = g4.specifiedSubstanceG4m.process[i];
    var stg = p.sites[0].stages;
    var pcanMap = {};
    for (ii = 0; ii < stg.length; ii++) {
      var stage = stg[ii];
      var sms = stage.startingMaterials;
      var rms = stage.resultingMaterials;
      var smnodes = [];
      //so we need to model a reaction.
      //first check if the substance is a candidate from other cases
      for (var iii = 0; iii < sms.length; iii++) {
        var smat = sms[iii];
        var nn = pcanMap[smat.substanceName.refuuid];
        var newNode = false;
        if (typeof nn === "undefined") nn = canMap[smat.substanceName.refuuid];
        if (typeof nn === "undefined") {
          newNode = true;
          nn=schemeUtil.makeMaterialNode(smat,ppid);
        }
        if ((smat.substanceRole + "").toUpperCase() === "INTERMEDIATE") {
          nn.brackets = true;
        }
        //need to think about this in cases where there's more
        nn.siblingsLeft = iii;
        nn.siblingsRight = sms.length - iii - 1;
        if (newNode) {
          nodes.push(nn);
        }
        smnodes.push(nn);
        if (iii < sms.length - 1) {
          var pn = { type: "plus" };
          pn.siblingsLeft = iii;
          pn.siblingsRight = sms.length - iii - 1;
          pn.id = ppid[0];
          ppid[0]++;
          nodes.push(pn);
          smnodes.push(pn);
        }
      }

      var rn = { type: "reaction", leftText: "Step " + stage.stageNumber };
      
      rn.processIndex=i;
      rn.stepIndex=iii;
      rn.id = ppid[0];
      ppid[0]++;
      nodes.push(rn);
      for (var j = 0; j < smnodes.length; j++) {
        var lin = {};
        lin.source = smnodes[j].id;
        lin.target = rn.id;
        lin.value = 1;
        links.push(lin);
      }

      for (var iii = 0; iii < rms.length; iii++) {
        var rmat = rms[iii];
        var nn = canMap[rmat.substanceName.refuuid];
        var newNode = false;
        if (typeof nn === "undefined") {
          newNode = true;
          nn=schemeUtil.makeMaterialNode(rmat,ppid);
        }
        if ((rmat.substanceRole + "").toUpperCase() === "INTERMEDIATE") {
          nn.brackets = true;
        }
        //need to think about this in cases where there's more
        nn.siblingsLeft = iii;
        nn.siblingsRight = rms.length - iii - 1;
        if (newNode) {
          nodes.push(nn);
        }
        pcanMap[rmat.substanceName.refuuid] = nn;
        var lin = {};
        lin.source = rn.id;
        lin.target = nn.id;
        lin.value = 1;
        links.push(lin);
        if (iii < rms.length - 1) {
          var pn = { type: "plus" };
          pn.siblingsLeft = iii;
          pn.siblingsRight = rms.length - iii - 1;
          pn.id = ppid[0];
          ppid[0]++;
          nodes.push(pn);

          var lin2 = {};
          lin2.source = rn.id;
          lin2.target = pn.id;
          lin2.value = 1;
          links.push(lin2);
        }
      }

      if (ii == stg.length - 1) {
        var ks = Object.keys(pcanMap);
        ks.map((kk) => (canMap[kk] = pcanMap[kk]));
      }
    }
  }
  var ret=JSON.parse(JSON.stringify({ nodes: nodes, links: links }));
  console.log(ret);
  return ret;
}

schemeUtil.renderScheme=function(nn2, selector) {
  var cheight = 150;
  var pwidth = 16;
  var maxText = 23;
  var width = schemeUtil.width;
  var height = schemeUtil.height;
  var paddingBrack = 6;

  var ss = d3.scaleOrdinal(d3.schemeCategory20);

  var getImg = (n) => {
    if (n.type === "reaction") {
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAQAAAAUb1BXAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfjCwkXKBl2gw6IAAAMZUlEQVR42u3dbcjddR3H8e81vbK8WahpaFLaDSFiWzeG3epsDpMaKeJNGEHQg0BKEoKoB8GMih4GkWUsjSCIqKEtIYLQVrMsJbxZokVTr1WUc8PcbF2zB1pi7ea6Oed8z+ec1+v7dOD39xu8d52z/39WAQAAAAAAAACMpZnuBYh0Vp25qF9/b23rXhmYVhvqmUXNZ7oXZjKs6F4AYKEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAMwQJiCBYQQ7CAGIIFxBAsIIZgATEEC4ghWEAM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";
    } else if (n.img) {
      return n.img;
    } else if (n.type === "plus") {
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA0gAAANICAIAAAByhViMAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAUPElEQVR4nO3dwW1dOYKG0WbjJkClUGk4F0ejlVA5OJQKwOtKgyFwAijMnQfKb/zq0zlbNe+vBVH4wAbksff+z6m11vHZOaddu3bt2rVr167dX7j73+OTAAC8FGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAirrXW8eE55/FZu3bt2rVr165du79214sdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAxPW7fwHgWd7f3//888/f/Vvwcr5///7jx4/f/VsAT+HFDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIOKacx4fXmsdn7Vr1+6zd8cYx18mbO99f+te8z7btWv3EV7sAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIi41lrHh+ecx2ft2rX77N299/GXCRtj3N+617zPdu3afYQXOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAirjnn8eG11vFZu3btPnt3jHH8ZcL23ve37jXvs127dh/hxQ4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCAiGutdXx4znl81q5du8/e3Xsff5mwMcb9rXvN+2zXrt1HeLEDAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIOKacx4fXmsdn7Vr1+6zd8cYx18mbO99f+te8z7btWv3EV7sAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIi41lrHh+ecx2ft2rX77N299/GXCRtj3N+617zPdu3afYQXOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAirjnn8eG11vFZu3btPnt3jHH8ZcL23ve37jXvs127dh/hxQ4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCAiGutdXx4znl81q5du8/e3Xsff5mwMcb9rXvN+2zXrt1HeLEDAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIOKacx4fXmsdn7Vr1+6zd8cYx18mbO99f+te8z7btWv3EV7sAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIi41lrHh+ecx2ft2rX77N299/GXCRtj3N+617zPdu3afYQXOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAirjnn8eG11vFZu3btPnt3jHH8ZcL23ve37jXvs127dh/hxQ4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCAiGutdXx4znl81q5du8/e3Xsff5mwMcb9rXvN+2zXrt1HeLEDAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIOKacx4fXmsdn7Vr1+6zd8cYx18mbO99f+te8z7btWv3EV7sAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIi41lrHh+ecx2ft2rX77N299/GXCRtj3N+617zPdu3afYQXOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAirjnn8eG11vFZu3btPnt3jHH8ZcL23ve37jXvs127dh/hxQ4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACDiet6n39/fb376mb+Jv/c+PmvX7tfZ/euvv46/TNjPnz/999mu3d+7+/Hxcfzl/2P3M7/0/T958fb2dvxlAICq+/ryT4oBACDsAAAqhB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCAiOszfwRvzvkLfxUAgK/gvr4+01de7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIGHvv48NrrZufvr29HX8ZAKDqvr7u++qeFzsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIq611vHhOecv/FUAAL6C+/r6TF95sQMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgYuy9jw+vtW5++vb2dvxlAICq+/q676t7XuwAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiLjWWseH55y/8FcBAPgK7uvrM33lxQ4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCAiLH3Pj681rr56dvb2/GXAQCq7uvrvq/uebEDAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIOJaax0fnnP+wl8FAOAruK+vz/SVFzsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIsbe+/jwWuvmp29vb8dfBgCouq+v+76658UOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgIhrrXV8eM75C38VAICv4L6+PtNXXuwAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAEHE979Pfv3+/+ene+/jLY4zjs3btfp3dnz9//v3338cfp+qPP/749u3bzf/gNe+zXbtfZ/cznhh2P378uPnp7/oXL+za/Tq77+/vwo5/+vbtm/8+27X7yruf4f+KBQCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiLi+2l9ztmv36+x+5h/DIWzvfX/rXvM+27Vr9xFe7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIuNZax4fnnMdn7dq1++zdvffxlwkbY9zfute8z3bt2n2EFzsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIq455/HhtdbxWbt27T57d4xx/GXC9t73t+4177Ndu3Yf4cUOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgIhrrXV8eM55fNauXbvP3t17H3+ZsDHG/a17zfts167dR3ixAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACDimnMeH15rHZ+1a9fus3fHGMdfJmzvfX/rXvM+27Vr9xFe7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIuNZax4fnnMdn7dq1++zdvffxlwkbY9zfute8z3bt2n2EFzsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIq455/HhtdbxWbt27T57d4xx/GXC9t73t+4177Ndu3Yf4cUOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgIhrrXV8eM55fNauXbvP3t17H3+ZsDHG/a17zfts167dR3ixAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACDimnMeH15rHZ+1a9fus3fHGMdfJmzvfX/rXvM+27Vr9xFe7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIuNZax4fnnMdn7dq1++zdvffxlwkbY9zfute8z3bt2n2EFzsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIq455/HhtdbxWbt27T57d4xx/GXC9t73t+4177Ndu3Yf4cUOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgIhrrXV8eM55fNauXbvP3t17H3+ZsDHG/a17zfts167dR3ixAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACDimnMeH15rHZ+1a9fus3fHGMdfJmzvfX/rXvM+27Vr9xFe7AAAIoQdAECEsAMAiBB2AAARwg4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIuNZax4fnnMdn7dq1++zdvffxlwkbY9zfute8z3bt2n2EFzsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCACGEHABAh7AAAIq455/HhtdbxWbt27T57d4xx/GXC9t73t+4177Ndu3Yf4cUOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAg4vrdvwDwLB8fHx8fH//bT/+Nf1Hd7v/PLvDv5cUOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAg4vo3/lV0u3bt2rVr165du//kxQ4AIELYAQBECDsAgAhhBwAQIewAACKEHQBAhLADAIgQdgAAEcIOACBC2AEARAg7AIAIYQcAECHsAAAihB0AQISwAwCIEHYAABHCDgAgQtgBAEQIOwCAiP8BtbEu97u9xo4AAAAASUVORK5CYII=";
    } else {
      return "https://upload.wikimedia.org/wikipedia/commons/1/16/NNK_chemical_structure.svg";
    }
  };

  var getLeftText = (n) => {
    if (n.leftText) {
      return n.leftText;
    } else {
      return "";
    }
  };
  var getWidth = (n) => {
    if (n.type === "reaction") {
      return "32px";
    } else if (n.imgWidth) {
      return n.imgWidth;
    } else if (n.type === "plus") {
      return pwidth + "px";
    } else {
      return cheight + "px";
    }
  };
  var getWidthPx = (n) => {
    return getWidth(n).replace("px", "") - 0;
  };
  var getHeightPx = (n) => {
    return getHeight(n).replace("px", "") - 0;
  };
  var getBracketWidth = (n) => {
    if (n.brackets) return 1;
    return 0;
  };
  var getHeight = (n) => {
    if (n.type === "reaction") {
      return "32px";
    } else if (n.imgHeight) {
      return n.imgHeight;
    } else if (n.type === "plus") {
      return pwidth + "px";
    } else {
      return cheight + "px";
    }
  };
  var getX = (n) => {
    var ww = getWidthPx(n);
    var pad = 0;

    if (n.siblingsLeft) {
      pad -= (ww * n.siblingsLeft) / 2 + n.siblingsLeft * pwidth;
    }
    if (n.siblingsRight) {
      pad += (ww * n.siblingsRight) / 2 + n.siblingsRight * pwidth;
    }
    if (n.type === "plus") pad = 0;
    return n.x - ww / 2 + pad;
  };
  var getY = (n) => {
    var hh = getHeightPx(n);
    return n.y - hh / 2;
  };
  d3.select(selector).select('svg').remove();
  var d3cola = cola.d3adaptor(d3).avoidOverlaps(true).size([width, height]);
  var svg = d3
    .select(selector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var wrap = {
    load: function (a, b) {
      b(null, a);
    }
  };

  wrap.load(nn2, function (error, graph) {
    var nodeRadius = 5;
    graph.nodes.forEach(function (v) {
      v.height = v.width = 2 * nodeRadius;
    });

    d3cola
      .nodes(graph.nodes)
      .links(graph.links)
      .flowLayout("y", 140)
      .symmetricDiffLinkLengths(6)
      .start(10, 20, 20);
    var path = svg
      .selectAll(".link")
      .data(graph.links)
      .enter()
      .append("svg:path")
      .attr("class", "link");

    var mnode = svg
      .selectAll(".node")
      .data(graph.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", function (d, i) {
        if (d.type === "reaction") {
          schemeUtil.onClickReaction(d);
          //do reaction stuff
        } else if (d.type === "material") {
          schemeUtil.onClickMaterial(d);
        }
      })
      .on("mouseover", function (d, i) {
        d3.select(this).style("cursor", "pointer");
      })
      .on("mousemouseoutover", function (d, i) {
        d3.select(this).style("cursor", "default");
      })
      .call(d3cola.drag);

    mnode
      .append("text")
      .text(function (d) {
        return schemeUtil.maxLen(d.bottomText, maxText);
      })
      .attr("dy", cheight + 20)
      .attr("font-family", "monospace");
    mnode
      .append("text")
      .text((d) => getLeftText(d))
      .attr(
        "dx",
        (d) => -1 * 5 * getLeftText(d).length - getWidth(d).replace("px", "")
      )
      .attr("dy", (d) => getHeight(d).replace("px", "") / 2)
      .attr("font-family", "monospace");
    mnode
      .append("text")
      .text(function (d) {
        return schemeUtil.maxLen(d.name, maxText);
      })
      .attr("dy", -20)
      .attr("font-family", "monospace");

    //long left
    mnode
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", (d) => getBracketWidth(d))
      .attr("x1", -paddingBrack)
      .attr("y1", -paddingBrack)
      .attr("x2", -paddingBrack)
      .attr("y2", (d) => getHeightPx(d) + paddingBrack);

    //left bracket top
    mnode
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", (d) => getBracketWidth(d))
      .attr("x1", -paddingBrack)
      .attr("y1", -paddingBrack)
      .attr("x2", 0)
      .attr("y2", -paddingBrack);
    //left bracket bottom
    mnode
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", (d) => getBracketWidth(d))
      .attr("x1", -paddingBrack)
      .attr("y1", (d) => getHeightPx(d) + paddingBrack)
      .attr("x2", 0)
      .attr("y2", (d) => getHeightPx(d) + paddingBrack);
    //long right
    mnode
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", (d) => getBracketWidth(d))
      .attr("x1", (d) => getWidthPx(d) + paddingBrack)
      .attr("y1", -paddingBrack)
      .attr("x2", (d) => getWidthPx(d) + paddingBrack)
      .attr("y2", (d) => getHeightPx(d) + paddingBrack);

    //Right bracket top
    mnode
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", (d) => getBracketWidth(d))
      .attr("x1", (d) => getWidthPx(d) + paddingBrack)
      .attr("y1", -paddingBrack)
      .attr("x2", (d) => getWidthPx(d))
      .attr("y2", -paddingBrack);
    //Right bracket bottom
    mnode
      .append("line")
      .style("stroke", "black")
      .style("stroke-width", (d) => getBracketWidth(d))
      .attr("x1", (d) => getWidthPx(d) + paddingBrack)
      .attr("y1", (d) => getHeightPx(d) + paddingBrack)
      .attr("x2", (d) => getWidthPx(d))
      .attr("y2", (d) => getHeightPx(d) + paddingBrack);

    var node = mnode
      .append("svg:image")

      .attr("class", "node")
      .attr("xlink:href", (d) => getImg(d))
      .attr("width", (d) => getWidth(d))
      .attr("height", (d) => getHeight(d))
      .attr("r", nodeRadius);

    d3cola.on("tick", function () {
      path.each(function (d) {
        if (schemeUtil.isIE()) this.parentNode.insertBefore(this, this);
      });
      // draw directed edges with proper padding from node centers
      path.attr("d", function (d) {
        var deltaX = d.target.x - d.source.x,
          deltaY = d.target.y - d.source.y,
          dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
          normX = deltaX / dist,
          normY = deltaY / dist,
          sourcePadding = nodeRadius,
          targetPadding = nodeRadius + 2,
          sourceX = d.source.x + sourcePadding * normX,
          sourceY = d.source.y + sourcePadding * normY,
          targetX = d.target.x - targetPadding * normX,
          targetY = d.target.y - targetPadding * normY;
        return "M" + sourceX + "," + sourceY + "L" + targetX + "," + targetY;
      });

      mnode.attr(
        "transform",
        (d) => "translate(" + getX(d) + "," + getY(d) + ")"
      );
      //                .attr("y", (d)=>getY(d));
    });
  });
}
schemeUtil.isIE = function() {
  return (
    navigator.appName == "Microsoft Internet Explorer" ||
    (navigator.appName == "Netscape" &&
      new RegExp("Trident/.*rv:([0-9]{1,}[.0-9]{0,})").exec(
        navigator.userAgent
      ) != null)
  );
}

