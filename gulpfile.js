var gulp = require('gulp');
var sass = require('gulp-sass');

var input = './sass/**/*.scss';
var output = './public/css';

var sassOptions = {
  errLogToConsole: true,
  outputStyle: 'expanded'
};

gulp.task('sass', function () {
  return gulp
    .src(input)
    .pipe(sass(sassOptions).on('error', sass.logError))
    .pipe(gulp.dest(output));
});
