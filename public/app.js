(function(global) {
  // socket.io does auto-discovery with no params
  var socket = io();

  socket.on('connect', function () {
    console.log('connected to WebSocket at', socket.io.uri);
    socket.emit('listSubmissions', { submissionType: 'eoi-project' });
    $("#submissionTypeSelector").on('change', function() {
      var selectorValue = $(this).val();
      var tableHeaders = {
        "eoi-project": "Project Title",
        "eoi-collab": "Artist Name",
        "eoi-fixed-media": "Submission Title",
        "eoi-academy": "Student Name"
      };
      $('#submissionList thead th:nth-child(2)').html(tableHeaders[selectorValue]);
      socket.emit('listSubmissions', { submissionType: selectorValue });
    });
  });

  socket.on('submissionList', function(retrievedSubmissions) {
    $('#submissionList').find("tbody").empty();
    retrievedSubmissions.forEach(function(submission) {
      $('#submissionList').find("tbody").append("<tr id='" + submission.submissionID + "'></tr>")
      var submissionRow = $('#'+submission.submissionID);
      var d = new Date(submission.timestamp);
      submissionRow.append("<td colspan='2'>"+d.toDateString()+"</td>");
      switch (submission.submissionType) {
        case "eoi-project":
          submissionRow.append("<td colspan='10'><a class='submissionLink' href='#' data-submission-id='"+submission.submissionID+"'>"+submission.project_title+"</a><br><small>"+submission.submissionID+"</small></td>");
          break;
        case "eoi-collab":
          submissionRow.append("<td colspan='10'><a class='submissionLink' href='#' data-submission-id='"+submission.submissionID+"'>"+submission.artistName+"</a><br><small>"+submission.submissionID+"</small></td>");
          break;
        case "eoi-fixed-media":
          submissionRow.append("<td colspan='10'><a class='submissionLink' href='#' data-submission-id='"+submission.submissionID+"'>Submission Link</a><br><small>"+submission.submissionID+"</small></td>");
          break;
        case "eoi-academy":
          submissionRow.append("<td colspan='10'><a class='submissionLink' href='#' data-submission-id='"+submission.submissionID+"'>"+submission.artistName+"</a><br><small>"+submission.submissionID+"</small></td>");
          break;
      }
    });
    $('.submissionLink').on('click', function() {
      var linkID = $(this).data("submission-id");
      socket.emit('getSubmission', linkID);
    });
  });

  socket.on('submissionEntry', function(content) {
    $.featherlight($('#mylightbox'), {html: content});
  })

  socket.on('disconnect', function () {
    console.log('socket disconnected');
  });

})(window);
