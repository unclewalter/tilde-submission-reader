(function(global) {
  // socket.io does auto-discovery with no params
  var socket = io();

  socket.on('connect', function () {
    console.log('connected to WebSocket at', socket.io.uri);
    socket.emit('listSubmissions', { submissionType: 'eoi-project' });
  });

  socket.on('submissionList', function(retrievedSubmissions) {
    $('#submissionList').find("tbody").empty();
    retrievedSubmissions.forEach(function(submission) {
      $('#submissionList').find("tbody").append("<tr id='" + submission.submissionID + "'></tr>")
      var submissionRow = $('#'+submission.submissionID);
      var d = new Date(submission.timestamp);
      submissionRow.append("<td colspan='1'>"+d.toDateString()+"</td>");
      submissionRow.append("<td colspan='4'><a class='submissionLink' href='#' data-submission-id='"+submission.submissionID+"'>"+submission.submissionID+"</a></td>");
      submissionRow.append("<td colspan='7'>"+submission.project_title+"</td>");
    });
    $('.submissionLink').on('click', function() {
      var linkID = $(this).data("submission-id");
      
    });
  });

  socket.on('disconnect', function () {
    console.log('socket disconnected');
  });

})(window);
