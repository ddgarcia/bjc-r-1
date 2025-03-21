/** curriculum.js
*
*  sets up a curriculum page -- either local or external.
*
*  JavaScript Dependencies:
*   llab.js
*   jQuery
*   library.js
*/

llab.file = "";
llab.url_list = [];

var FULL = llab.selectors.FULL,
hamburger = llab.fragments.hamburger;

// TODO: secondarySetUp (until the conditional) should be called on each page.
llab.secondarySetUp = function() {
  llab.setupTitle();

  // Get the topic file and step from the URL
  llab.file = llab.getQueryParameter("topic");

  llab.addFeedback(document.title, llab.file, llab.getQueryParameter('course'));
  llab.addFooter();

  // We don't have a topic file, so we should exit.
  if (llab.file === '' || !llab.isCurriculum()) {
    return;
  }

  // fix snap links so they run snap
  $('a.run').each(function(i) {
    $(this).attr('target', '_blank');
    $(this).attr('href', llab.getSnapRunURL(this.getAttribute('href')));
  });

  // making ifTime and takeItFurther DIVs hide until clicked --MF, 2/9/18
  $('div.ifTime').each(function(i) {
    var divcontent = this.innerHTML;
    this.innerHTML = "&nbsp;<a style='font-size: 18px;' href='#hint-ifTime".concat(i, "' data-toggle='collapse' title='If There Is Time...'><strong>If There Is Time...</strong></a><div id='hint-ifTime", i, "' class='collapse'>", divcontent, "</div>");
  });
  $('div.takeItFurther').each(function(i) {
    var divcontent = this.innerHTML;
    this.innerHTML = "&nbsp;<a style='font-size: 18px;' href='#hint-takeItFurther".concat(i, "' data-toggle='collapse' title='Take It Further...'><strong>Take It Further...</strong></a><div id='hint-takeItFurther", i, "' class='collapse'>", divcontent, "</div>");
  });
  $('div.takeItTeased').each(function(i) {
    var divcontent = this.innerHTML;
    this.innerHTML = "&nbsp;<a style='font-size: 18px;' href='#hint-takeItFurther".concat(i, "' data-toggle='collapse' title='Take It Further...'><strong>Take It Further...</strong></a><div id='hint-takeItFurther", i, "' class='collapse'>", divcontent, "</div>");
  });

  llab.additionalSetup([
    {  // TODO: PUT THESE CLASSES SOMEWHERE
      trigger: 'pre code',
      function: llab.codeHighlightSetup()
    },
    {   // TODO: PUT THESE CLASSES SOMEWHERE
      trigger: '.katex, .katex-inline, .katex-block',
      function: llab.mathDisplaySetup()
    }
  ]);

  $.ajax({
    url: `${llab.rootURL}topic/${llab.file}`,
    type: "GET",
    contentType: 'text/plain; charset=UTF-8',
    dataType: "text",
    cache: true,
    success: llab.processLinks,
    error: function(_jqXHR, status, error) {
      // TODO: We should push errors to Google Analytics
      console.log('Error Accessing Topic: ' + llab.file);
      console.log('Error: ' + error);
      console.log('Status: ' + status);
    }
  });

}; // close secondarysetup();


/** A prelimary API for defining loading additional content based on triggers.
*  @{param} array TRIGGERS is an array of {trigger, callback} pairs.
*  a `trigger` is currently a CSS selector that gets passed to $ to see if any
*  of those elements are on the current page. If the elements are found then a
*  `callback` is called with no arguments.
*  TODO: Cleanup and test this code.
*  TODO: Explore ideas for better trigger options?
*/
llab.additionalSetup = function(triggers) {
  var items;
  triggers.forEach(function (obj) {
    if (obj.trigger && obj.function) {
      items = $(trigger);
      if (items.length) {
        Function.call(null, obj.function);
      }
    }
  });
}

/** Import the required JS and CSS for Code highlighting.
*  TODO: Abstract this away into its own function
*/
llab.codeHighlightSetup = function () {
  var cssFile, jsFile, css, js;
  cssFile = llab.paths.syntax_highlighting_css;
  jsFile  = llab.paths.syntax_highlights;
  css = getTag('link', cssFile, 'text/css');
  css.rel = "stylesheet";
  js = getTag('script', jsFile, 'text/javascript');
  // onload function
  $(js).attr({'onload': 'llab.highlightSyntax()'});
  // Using $ to append to head causes onload not to be fired...
  document.head.appendChild(css);
  document.head.appendChild(js);
}

// Call The Functions to HighlightJS to render
llab.highlightSyntax = function() {
  // TODO: PUT THESE CLASSES SOMEWHERE
  $('pre > code').each(function(i, block) {
    // Trim the extra whitespace in HTML files.
    block.innerHTML = block.innerHTML.trim();
    if (typeof hljs !== 'undefined') {
      hljs.highlightBlock(block);
    }
  });
}

/** Import the required JS and CSS for LaTeX Code.
*  TODO: Abstract this away into its own function
*/
llab.mathDisplaySetup = function () {
  var cssFile, jsFile, css, js;
  cssFile = llab.paths.katex_css;
  jsFile  = llab.paths.math_katex_js;
  css = getTag('link', cssFile, 'text/css');
  css.rel = "stylesheet";
  js = getTag('script', jsFile, 'text/javascript');
  // onload function
  $(js).attr({'onload': 'llab.displayMathDivs()'});
  // Using $ to append to head causes onload not to be fired...
  document.head.appendChild(css);
  document.head.appendChild(js);
}

// Call the KaTeX APIS to render the LaTeX code.
llab.displayMathDivs = function () {
  $('.katex, .katex-inline').each(function (idx, elm) {
    katex.render(elm.textContent, elm, {throwOnError: false});
  });
  $('.katex-block').each(function (idx, elm) {
    katex.render(elm.textContent, elm, {
      displayMode: true, throwOnError: false
    });
  });
}

/**
*  Processes just the hyperlinked elements in the topic file,
*  and creates navigation buttons.
*  FIXME: This should share code with llab.topic!
*/
llab.processLinks = function(data, _status, _jqXHR) {
  /* NOTE: DO NOT REMOVE THIS CONDITIONAL WITHOUT SERIOUS TESTING
  * llab.file gets reset with the ajax call.
  */
  if (llab.file === '') {
    llab.file = llab.getQueryParameter('topic');
  }

  if (location.pathname === llab.empty_curriculum_page_path) {
    llab.addFrame();
  }

  // Get the URL parameters as an object
  // FIXME -- Rename the url variable
  // FIXME -- duplicate query parameters?
  var params = llab.getURLParameters(),
  course = params.course || '',
  topicArray = data.split("\n"),
  url = document.URL,
  // TODO: Move this to a dropdown function
  list = $(document.createElement("ul")).attr({
    'class': 'dropdown-menu dropdown-menu-right',
    'role': 'menu',
    'aria-labeledby': 'Topic-Navigation-Menu'
  }),
  itemContent,
  ddItem,
  line,
  isHidden,
  isHeading,
  lineClass,
  i = 0,
  len = topicArray.length,
  pageCount = -1,
  urlOpen, urlClose;

  // Prevent src, title from being added to other URLS.
  delete params.src;
  delete params.title;

  for (; i < len; i += 1) {
    line = llab.stripComments($.trim(topicArray[i]));

    sepIndex = line.indexOf(':');
    urlOpen = line.indexOf('[');
    urlClose = line.indexOf(']');

    // Skip is this line is hidden in URL params.
    lineClass = $.trim(line.slice(0, sepIndex));
    isHidden = params.hasOwnProperty('no' + lineClass);
    if (isHidden || !line) { continue; }

    // Line is a title; Create a link back to the main topic.
    if (line.indexOf("title:") !== -1) {
      url = llab.topic_launch_page + "?" + llab.QS.stringify(params);

      itemContent = line.slice(sepIndex + 1);
      itemContent = $.trim(itemContent);

      // Create a special Title link and add a separator.
      itemContent = llab.spanTag(itemContent, 'main-topic-link');
      ddItem = llab.dropdownItem(itemContent, url);
      // Note: Add to top of list!
      list.prepend(llab.fragments.bootstrapSep);
      list.prepend(ddItem);

      continue;
    }

    // Line is a heading in a topic file, so create menu heading
    isHeading = lineClass == 'heading';
    if (isHeading) {
      itemContent = line.slice(sepIndex + 1);
      itemContent = $.trim(itemContent);
      ddItem = llab.dropdownItem(itemContent);
      ddItem.addClass('dropdown-header');
      list.append(ddItem);
    }

    // If we don't have a link, skip this line.
    hasLink = urlOpen !== -1 && urlClose !== -1;
    if (!hasLink) { continue; }

    // Grab the link title between : [
    itemContent = line.slice(sepIndex + 1, urlOpen);
    itemContent = $.trim(itemContent);
    // Grab the link betweem [ and ]
    url = line.slice(urlOpen + 1, urlClose);
    pageCount += 1;
    // Content References an external resource
    if (url.indexOf("//") !== -1) {
    isCurrentPage = llab.getQueryParameter('src') === decodeURIComponent(url);
    url = llab.empty_curriculum_page_path + "?" + llab.QS.stringify(
      $.extend({}, params, {
        src: url,
        title: itemContent
      }));
    } else { // Content reference is local
      isCurrentPage = document.URL.indexOf(url) !== -1;
      if (url.indexOf(llab.rootURL) === -1 && url.indexOf("..") === -1) {
        url = llab.rootURL + (url[0] === "/" ? '' : "/") + url;
      }
      url += url.indexOf("?") !== -1 ? "&" : "?";
      url += llab.QS.stringify($.extend({}, params));
    }

    llab.url_list.push(url);

    // Make the current step have an arrow in the dropdown menu
    if (isCurrentPage) {
      llab.pageNum = pageCount;
      itemContent = llab.spanTag(itemContent, 'current-page-arrow');
    }

    ddItem = llab.dropdownItem(itemContent, url);
    list.append(ddItem);
  } // end for loop

  if (course) {
    if (course.indexOf("//") === -1) {
      course = llab.courses_path + course;
    }
    itemContent = llab.spanTag(llab.strings.goMain, 'course-link-list');
    ddItem = llab.dropdownItem(itemContent, course);
    list.prepend(ddItem);
  }
  // Setup the nav button links and build the dropdown.
  llab.setButtonURLs();
  llab.buildDropdown();
  // FIXME -- will break on pages with multiple dropdowns (future)
  $('.dropdown').append(list);
  // Set the max-height of the dropdown list to not exceed window height
  // This is particularly important for smaller screens.
  $('.dropdown-menu').css('max-height', $(window).height() * 0.8);
  $('.dropdown-menu').css('max-width', Math.min($(window).width() * 0.8, 450));

  // FIXME -- this doesn't belong here.
  llab.indicateProgress(llab.url_list.length, llab.thisPageNum() + 1);

}; // end processLinks()


// Create an iframe when loading from an empty curriculum page
// Used for embedded content. (Videos, books, etc)
llab.addFrame = function() {
  var source = llab.getQueryParameter("src");

  var frame = $(document.createElement("iframe")).attr(
    {'src': source, 'class': 'content-embed'}
  );

  var conent = $(document.createElement('div'));
  conent.append(
    '<a href=' + source + ' target="_blank">Open page in new window</a><br />'
  );
  conent.append(frame);

  $(FULL).append(conent);
};

// Setup the entire page title. This includes creating any HTML elements.
// This should be called EARLY in the load process!
// FIXME: lots of stuff needs to be pulled out of this function
llab.setupTitle = function() {
  // TODO: rename / refactor location
  $(document.head).append('<meta name="viewport" content="width=device-width, initial-scale=1">');

  if (llab.titleSet) {
    return;
  }

  // Create .full before adding stuff.
  if ($(FULL).length === 0) {
    $(document.body).wrapInner('<div class="full"></div>');
  }

  // Work around when things are oddly loaded...
  if ($(llab.selectors.NAVSELECT).length !== 0) {
    $(llab.selectors.NAVSELECT).remove();
  }

  // Create the header section and nav buttons
  llab.createTitleNav();

  // create Title tag, yo
  var titleText = llab.getQueryParameter("title");
  if (titleText !== '') {
    document.title = titleText;
  }

  // Set the header title to the page title.
  titleText = document.title;
  if (titleText) {
    // FIXME this needs to be a selector
    $('.navbar-title').html(titleText);
    $('.title-small-screen').html(titleText);
  }

  // Clean up document title if it contains HTML
  document.title = $(".navbar-title").text();
  // Special Case for Snap! in titles.
  document.title = document.title.replace('snap', 'Snap!');

  $(document.body).css('padding-top', $('.llab-nav').height() - 100);
  document.body.onresize = function(_event) {
    $(document.body).css('padding-top', $('.llab-nav').height() + 10);
  };

  llab.titleSet = true;
};

llab.toggleDevComments = function() {
  $(".todo, .comment, .commentBig").toggle();
};

llab.hideAllDevComments = function() {
  $('.todo, .comment, .commentBig').hide();
}

llab.canShowDevComments = function () {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

// Create the 'sticky' title header at the top of each page.
llab.createTitleNav = function() {
  var addToggle = "";

  if (llab.canShowDevComments()) {
    addToggle = $('<button>').addClass('imageRight btn btn-default')
    .click(llab.toggleDevComments)
    .text('Toggle developer todos/comments (red boxes)');
  } else {
    // Delay hiding until everything is ready. (Shouldn't be needed?)
    $(window).load(llab.hideAllDevComments);
  }

  // The BJC Logo takes you to the course ToC, or the BJC index when there is no course defined.
  let navDestination = '/bjc-r';
  let logoURL = '/bjc-r/img/header-footer/bjc-logo-sm2.png';
  if (llab.getQueryParameter('course')) {
    navDestination = `/bjc-r/course/${llab.getQueryParameter('course')}`;
  } else if (location.pathname.indexOf('/bjc-r/course/')) {
    navDestination = location.pathname;
  }

  var topHTML = `
    <nav class="llab-nav navbar navbar-default navbar-fixed-top nopadtb" role="navigation">
      <div class="nav navbar-nav navbar-left">
        <a class="site-title" rel="author" href="${navDestination}">
          <img src="${logoURL}" alt="BJC logo" class="pull-left">
        </a>
        <div class="navbar-title"></div>
      </div>
      <div class="trapezoid"></div>
      <div class="nav navbar-nav navbar-right">
        <ul class="nav-btns btn-group"></ul>
      </div>
    </nav>
    <div class="title-small-screen"></div>
    `,
    botHTML = '<div class="full-bottom-bar"><div class="bottom-nav btn-group"></div></div>',
    topNav = $(llab.selectors.NAVSELECT),
    buttons = "<a class='btn btn-default backbutton arrow'>back</a>" +
    "<a class='btn btn-default forwardbutton arrow'>next</a>";

  if (topNav.length === 0) {
    $(FULL).prepend(addToggle);
    $(document.body).prepend(topHTML);
  }

  // Don't add anything else if we don't know the step...
  // FUTURE - We should separate the rest of this function if necessary.
  if (!llab.isCurriculum()) {
    return;
  }

  // TODO: selector...
  $('.nav-btns').append(buttons);
  if ($(llab.selectors.PROGRESS).length === 0) {
    $(document.body).append(botHTML);
    $('.bottom-nav').append(buttons);
  }

  llab.setButtonURLs();
};


// Create the navigation dropdown
llab.buildDropdown = function() {
  var dropdown, list_header;
  // Container div for the whole menu (title + links)
  dropdown = $(document.createElement("div")).attr(
    {'class': 'dropdown inline'}
  );

  // build the list header
  list_header = $(document.createElement("button")).attr(
    {'class': 'navbar-toggle btn btn-default dropdown-toggle list_header',
    'type' : 'button', 'data-toggle' : "dropdown" }
  );
  list_header.append(hamburger);

  // Add Header to dropdown
  dropdown.append(list_header);
  // Insert into the top div AFTER the backbutton.
  dropdown.insertAfter($('.navbar-default .navbar-right .backbutton'));
};

/** Build an item for the navigation dropdown
*  Takes in TEXT and a URL and reutrns a list item to be added
*  too an existing dropdown */
llab.dropdownItem = function(text, url) {
  var item, link;
  // li container
  item = $(document.createElement("li")).attr(
    {'class': 'list_item', 'role' : 'presentation'}
  );
  if (url) {
    link = $('<a>').attr({'href': url, 'role' : 'menuitem'});
    link.html(text);
    item.append(link);
  } else {
    item.html(text);
  }

  return item;
};

// Pages directly within a lab. Excludes 'topic' and 'course' pages.
llab.isCurriculum = function() {
  if (llab.getQueryParameter('topic')) {
    return ![
      llab.empty_topic_page_path, llab.topic_launch_page, llab.alt_topic_page
    ].includes(location.pathname);
  }
  return false;
}


/* Return the index value of this page in reference to the lab.
* Indicies are 0 based, and this excludes query parameters because
* they could become re-ordered. */
llab.thisPageNum = function() {
  return llab.pageNum;
}

// Create the Forward and Backward buttons, properly disabling them when needed
llab.setButtonURLs = function() {
  // No dropdowns for places that don't have a step.
  if (!llab.isCurriculum()) {
    return;
  }

  var forward = $('.forwardbutton'), back = $('.backbutton');
  var buttonsExist = forward.length !== 0 && back.length !== 0;

  if (!buttonsExist & $(llab.selectors.NAVSELECT) !== 0) {
    // freshly minted buttons. MMM, tasty!
    llab.createTitleNav();
  }

  forward = $('.forwardbutton');
  back     = $('.backbutton');

  // Disable the back button
  // TODO: switch from using `.disabled` to [disabled] in css
  var thisPage = llab.thisPageNum();
  if (thisPage === 0) {
    back.each(function(i, item) {
      $(item).addClass('disabled').removeAttr('href').attr('disabled', true);
    });
  } else {
    back.each(function(i, item) {
      $(item).removeClass('disabled').removeAttr('disabled')
      .attr('href', llab.url_list[thisPage - 1])
      .click(llab.goBack);
    });
  }

  // Disable the forward button
  if (thisPage === llab.url_list.length - 1) {
    forward.each(function(i, item) {
      $(item).addClass('disabled').removeAttr('href').attr('disabled', true);
    });
  } else {
    forward.each(function(i, item) {
      $(item).removeClass('disabled').removeAttr('disabled')
      .attr('href', llab.url_list[thisPage + 1])
      .click(llab.goForward);
    });
  }
};

// TODO: Update page content and push URL onto browser back button
llab.goBack = function() {
  location.href = llab.url_list[llab.thisPageNum() - 1];
};

llab.goForward = function() {
  location.href = llab.url_list[llab.thisPageNum() + 1];
};

llab.addFeedback = function(title, topic, course) {
  // Prevent Button on small devices
  if (screen.width < 1024) {
    return;
  }

  // Prevent Feedback Button on non Teacher Guide pages (Added by Mary Fries on 10/16/17)
  if (location.pathname.slice(0,25) != "/bjc-r/cur/teaching-guide") {
    return;
  }

  // TODO: Make this config
  var surveyURL = 'https://getfeedback.com/r/LRm9oI3N?';
  surveyURL += $.param({
    'PAGE': title,
    'TOPIC': topic,
    'COURSE': course,
    'URL': document.url
  });

  var button = $(document.createElement('button')).attr({
    'class': 'btn btn-primary btn-xs feedback-button',
    'type': 'button',
    'data-toggle': "collapse",
    'data-target': "#fdbk"
  }).text('Feedback'),
  innerDiv = $(document.createElement('div')).attr({
    'id': "fdbk",
    'class': "collapse feedback-panel panel panel-primary"
  }),
  feedback = $(document.createElement('div')).attr(
    {'class' : 'page-feedback'}
  ).append(button, innerDiv);

  // Delay inserting a frame until the button is clicked.
  // Reason 1: Performance
  // Reason 2: GetFeedback tracks "opens" and each load is an open
  button.click('click', function(_event) {
    if ($('#feedback-frame').length === 0) {
      var frame = $(document.createElement('iframe')).attr({
        'frameborder': "0",
        'id': 'feedback-frame',
        'width': "300",
        'height': "230",
        'src': surveyURL
      });
      $('#fdbk').append(frame);
    }
  });
  $(document.body).append(feedback);
};

// Footer content added by Mary on 1/20/16 was moved outside of feedback function by Mary on 10/16/17
llab.addFooter = function() {
  $(document.body).append(
    `<footer>
      <div class="footer wrapper margins">
        <div class="footer-col col1">
          <img class="noshadow" src="/bjc-r/img/header-footer/NSF_logo.png" alt="NSF" />
        </div>
        <div class="footer-col col2">
          <img class="noshadow" src="/bjc-r/img/header-footer/EDC_logo.png" alt="EDC" />
        </div>
        <div class="footer-col col3">
          <img class="noshadow" src="/bjc-r/img/header-footer/UCB_logo.png" alt="UCB" />
        </div>
        <div class="footer-col col4">
          <p>The Beauty and Joy of Computing by University of California, Berkeley and Education
          Development Center, Inc. is licensed under a Creative Commons
          Attribution-NonCommercial-ShareAlike 4.0 International License. The development of this
          site is funded by the National Science Foundation under grant nos. 1138596 and 1441075.
          Any opinions, findings, and conclusions or recommendations expressed in this material are
          those of the author(s) and do not necessarily reflect the views of the National Science
          Foundation.
        </p>
      </div>
      <div class="footer-col col5">
        <img class="noshadow" src="/bjc-r/img/header-footer/cc_88x31.png" alt="Creative Commons Attribution" />
      </div>
    </div>
  </footer>`
  );
}

/**
*  Positions an image along the bottom of the lab page, signifying progress.
*  numSteps is the total number of steps in the lab
*  currentStep is the number of the current step
*  Note, these steps are 0 indexed!
*/
llab.indicateProgress = function(numSteps, currentStep) {
  var progress = $(llab.selectors.PROGRESS),
  width = progress.width(),
  // TODO: This neeeds to be a global selector!!
  btns = $('.bottom-nav').width(),
  pctMargin, result; // result stores left-offset of background image.

  /* This works as long as the buttons are on the RIGHT of the image to be
  * moved. The image on the last step will be moved at most the % width of
  * the buttons.
  */
  pctMargin = (btns / width) * 100;
  result = currentStep /  (numSteps + 1);
  result = result * (100 - pctMargin);
  result = result + "% 3px";
  // 3px == height of bottom-bar - image height == (32px - 26px)/ 2
  progress.css("background-position", result);
};

// Setup the nav and parse the topic file.
$(document).ready(function() {
  llab.secondarySetUp();
});
